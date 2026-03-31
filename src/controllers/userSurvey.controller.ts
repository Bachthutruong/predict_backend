import { Request, Response } from 'express';
import Survey, { ISurveyQuestion, ISurveyOption } from '../models/survey';
import SurveySubmission from '../models/survey-submission';
import User from '../models/user';
import PointTransaction from '../models/point-transaction';
import mongoose from 'mongoose';
import { pickLocalizedText, resolveLanguageFromRequest } from '../utils/language';

// @desc    Get all published surveys available to users
// @route   GET /api/surveys
// @access  Private
export const getPublishedSurveys = async (req: Request, res: Response) => {
    try {
        const lang = resolveLanguageFromRequest(req);
        const surveys = await Survey.find({
            status: 'published',
            $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gt: new Date() } }
            ]
        }).select('-questions.isAntiFraud -questions.options.antiFraudGroupId').sort({ createdAt: -1 });
        const localized = surveys
          .map((survey: any) => {
            const surveyObj = survey.toObject();
            return {
              ...surveyObj,
              title: pickLocalizedText(lang, surveyObj.titleTranslations, ''),
              description: pickLocalizedText(lang, surveyObj.descriptionTranslations, '')
            };
          })
          .filter((survey) => Boolean(survey.title && survey.description));

        res.json({ message: 'Available surveys fetched successfully', data: localized });
    } catch (error) {
        console.error('Error fetching published surveys:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get a single survey to fill out
// @route   GET /api/surveys/:id
// @access  Private
export const getSurveyToFill = async (req: Request, res: Response) => {
    try {
        const lang = resolveLanguageFromRequest(req);
        const survey = await Survey.findOne({
            _id: req.params.id,
            status: 'published'
        }).select('-questions.isAntiFraud -questions.options.antiFraudGroupId');

        if (!survey) {
            return res.status(404).json({ message: 'Survey not found or is not currently active.' });
        }

        const surveyObject = survey.toObject();
        const localizedQuestions = (surveyObject.questions || [])
          .map((question: any) => ({
            ...question,
            text: pickLocalizedText(lang, question.textTranslations, ''),
            options: (question.options || [])
              .map((option: any) => ({
                ...option,
                text: pickLocalizedText(lang, option.textTranslations, '')
              }))
              .filter((option: any) => Boolean(option.text))
          }))
          .filter((question: any) => Boolean(question.text));
        const localizedSurvey = {
          ...surveyObject,
          title: pickLocalizedText(lang, surveyObject.titleTranslations, ''),
          description: pickLocalizedText(lang, surveyObject.descriptionTranslations, ''),
          questions: localizedQuestions
        };
        if (!localizedSurvey.title || !localizedSurvey.description) {
          return res.status(404).json({ message: 'Survey not found or is not currently active.' });
        }

        // Check if user has already submitted this survey
        const userId = (req as any).user.id;
        const existingSubmission = await SurveySubmission.findOne({ surveyId: survey._id, userId });
        if (existingSubmission) {
            return res.status(403).json({ message: 'You have already completed this survey.' });
        }

        res.json({ message: 'Survey details fetched successfully', data: localizedSurvey });
    } catch (error) {
        console.error('Error fetching survey to fill:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Submit answers for a survey
// @route   POST /api/surveys/:id/submit
// @access  Private
export const submitSurvey = async (req: Request, res: Response) => {
    const surveyId = req.params.id;
    const userId = (req as any).user.id;
    const lang = resolveLanguageFromRequest(req);
    const { answers }: { answers: { questionId: string; answer: string[]; otherText?: string }[] } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const survey = await Survey.findById(surveyId).session(session);
        if (!survey || survey.status !== 'published') {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Survey not found or is no longer active.' });
        }

        const existingSubmission = await SurveySubmission.findOne({ surveyId, userId }).session(session);
        if (existingSubmission) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'You have already submitted this survey.' });
        }

        // --- Anti-Fraud Check ---
        let isFraudulent = false;
        let fraudReason = '';
        const antiFraudQuestions = survey.questions.filter(q => q.isAntiFraud);
        
        if (antiFraudQuestions.length >= 2) {
            const fraudAnswersGroupIds: string[] = [];
            for (const q of antiFraudQuestions) {
                const userAnswer = answers.find(a => a.questionId === q.id);
                if (userAnswer && userAnswer.answer.length > 0) {
                    // For each answer from the user, find the corresponding option in the survey question
                    for (const ans of userAnswer.answer) {
                        const option = q.options.find(opt => {
                            const localizedOptionText = pickLocalizedText(
                              lang,
                              (opt as any).textTranslations as Record<string, string> | undefined,
                              (opt as any).text || ''
                            );
                            return opt.text === ans || localizedOptionText === ans;
                        });
                        if (option && option.antiFraudGroupId) {
                            fraudAnswersGroupIds.push(option.antiFraudGroupId);
                        }
                    }
                }
            }

            // Check if all collected group IDs are the same
            if (fraudAnswersGroupIds.length > 0 && !fraudAnswersGroupIds.every(gid => gid === fraudAnswersGroupIds[0])) {
                isFraudulent = true;
                fraudReason = 'Mismatch in answers for anti-fraud questions.';
            }
        }
        // --- End of Anti-Fraud Check ---

        // Map answers to include question text and type for archival
        const detailedAnswers = answers.map(ans => {
            const question = survey.questions.find(q => q.id === ans.questionId);
            return {
                questionId: ans.questionId,
                questionText: question ? pickLocalizedText(lang, (question as any).textTranslations, question.text) : 'Unknown Question',
                questionType: question ? question.type : 'unknown',
                answer: ans.answer,
                otherText: ans.otherText,
            };
        });

        const submission = new SurveySubmission({
            surveyId,
            userId,
            answers: detailedAnswers,
            isFraudulent,
            fraudReason,
        });
        await submission.save({ session });

        // If not fraudulent, grant points
        if (!isFraudulent && survey.pointsAwarded > 0) {
            const user = await User.findById(userId).session(session);
            if (user) {
                user.points += survey.pointsAwarded;
                await user.save({ session });

                const transaction = new PointTransaction({
                    userId: userId,
                    type: 'credit',
                    reason: 'survey-completion',
                    amount: survey.pointsAwarded,
                    description: `Survey completion: ${survey.title}`,
                    source: 'survey',
                    sourceId: surveyId
                });
                await transaction.save({ session });
            }
        }
        
        await session.commitTransaction();

        if (isFraudulent) {
            return res.status(200).json({ 
                message: 'Your submission has been recorded, but it was flagged as potentially fraudulent. No points will be awarded.',
                data: { isFraudulent: true, reason: fraudReason }
            });
        }

        res.status(201).json({ 
            message: `Survey submitted successfully! You have been awarded ${survey.pointsAwarded} points.`,
            data: { isFraudulent: false }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error submitting survey:', error);
        res.status(500).json({ message: 'Server error during submission.' });
    } finally {
        session.endSession();
    }
}; 