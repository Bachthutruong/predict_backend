import { Request, Response } from 'express';
import Survey, { ISurveyQuestion, ISurveyOption } from '../models/survey';
import SurveySubmission from '../models/survey-submission';
import User from '../models/user';
import PointTransaction from '../models/point-transaction';
import exceljs from 'exceljs';
import mongoose from 'mongoose';

// @desc    Create a new survey
// @route   POST /api/admin/surveys
// @access  Private/Admin
export const createSurvey = async (req: Request, res: Response) => {
  const { title, description, pointsAwarded, endDate, questions, status, imageUrl }: {
    title: string;
    description:string;
    pointsAwarded: number;
    endDate?: Date;
    questions: ISurveyQuestion[];
    status: 'draft' | 'published' | 'closed';
    imageUrl?: string;
  } = req.body;
  
  // Basic validation
  if (!title || !description || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ message: 'Missing required fields: title, description, questions.' });
  }

  // Anti-fraud validation: must have at least two anti-fraud questions if any are marked
  const antiFraudQuestions = questions.filter(q => q.isAntiFraud);
  if (antiFraudQuestions.length > 0 && antiFraudQuestions.length < 2) {
    return res.status(400).json({ message: 'To enable anti-fraud checks, you must mark at least two questions as anti-fraud questions.' });
  }
  // Validate that anti-fraud questions have options with group IDs
  for (const q of antiFraudQuestions) {
    if (!q.options || q.options.some((opt: ISurveyOption) => !opt.antiFraudGroupId)) {
        return res.status(400).json({ message: `All options for anti-fraud question "${q.text}" must have an Anti-Fraud Group ID.` });
    }
  }

  try {
    const survey = new Survey({
      title,
      description,
      pointsAwarded,
      endDate,
      questions,
      status,
      imageUrl,
      createdBy: (req as any).user.id, // Assuming user ID is available on request
    });

    const createdSurvey = await survey.save();
    res.status(201).json({ message: 'Survey created successfully', data: createdSurvey });
  } catch (error) {
    console.error('Error creating survey:', error);
    if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    res.status(500).json({ message: 'Server error while creating survey.' });
  }
};

// @desc    Get all surveys
// @route   GET /api/admin/surveys
// @access  Private/Admin
export const getSurveys = async (req: Request, res: Response) => {
    try {
        const surveys = await Survey.find().sort({ createdAt: -1 });
        res.json({ message: 'Surveys fetched successfully', data: surveys });
    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get a single survey by ID
// @route   GET /api/admin/surveys/:id
// @access  Private/Admin
export const getSurveyById = async (req: Request, res: Response) => {
    try {
        const survey = await Survey.findById(req.params.id);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }
        res.json({ message: 'Survey fetched successfully', data: survey });
    } catch (error) {
        console.error('Error fetching survey by ID:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update a survey
// @route   PUT /api/admin/surveys/:id
// @access  Private/Admin
export const updateSurvey = async (req: Request, res: Response) => {
    const { title, description, pointsAwarded, endDate, questions, status, imageUrl } = req.body;

    try {
        const survey = await Survey.findById(req.params.id);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }

        // Anti-fraud validation
        if (questions && Array.isArray(questions)) {
            const antiFraudQuestions = questions.filter(q => q.isAntiFraud);
            if (antiFraudQuestions.length > 0 && antiFraudQuestions.length < 2) {
                return res.status(400).json({ message: 'To enable anti-fraud checks, you must mark at least two questions as anti-fraud questions.' });
            }
            for (const q of antiFraudQuestions) {
                if (!q.options || q.options.some((opt: ISurveyOption) => !opt.antiFraudGroupId)) {
                    return res.status(400).json({ message: `All options for anti-fraud question "${q.text}" must have an Anti-Fraud Group ID.` });
                }
            }
        }

        survey.title = title || survey.title;
        survey.description = description || survey.description;
        survey.pointsAwarded = pointsAwarded ?? survey.pointsAwarded;
        survey.endDate = endDate;
        survey.questions = questions || survey.questions;
        survey.status = status || survey.status;
        survey.imageUrl = imageUrl || survey.imageUrl;

        const updatedSurvey = await survey.save();
        res.json({ message: 'Survey updated successfully', data: updatedSurvey });
    } catch (error) {
        console.error('Error updating survey:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a survey
// @route   DELETE /api/admin/surveys/:id
// @access  Private/Admin
export const deleteSurvey = async (req: Request, res: Response) => {
    try {
        const survey = await Survey.findById(req.params.id);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }
        
        // Also delete all submissions related to this survey
        await SurveySubmission.deleteMany({ surveyId: req.params.id });

        await survey.deleteOne();

        res.json({ message: 'Survey and all its submissions have been deleted.' });
    } catch (error) {
        console.error('Error deleting survey:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all submissions for a survey
// @route   GET /api/admin/surveys/:id/submissions
// @access  Private/Admin
export const getSurveySubmissions = async (req: Request, res: Response) => {
    try {
        const submissions = await SurveySubmission.find({ surveyId: req.params.id })
            .populate<{ userId: { _id: string, name: string, email: string } }>('userId', 'name email')
            .sort({ submittedAt: -1 })
            .lean();

        // Remap data to match frontend's expected structure { user: { ... } }
        const formattedData = submissions.map(sub => {
            if (sub.userId && typeof sub.userId === 'object') {
                return {
                    ...sub,
                    user: sub.userId,
                    userId: sub.userId._id,
                };
            }
            return {
                ...sub,
                user: { name: 'N/A', email: 'N/A' },
            };
        });

        res.json({ message: 'Submissions fetched successfully', data: formattedData });
    } catch (error) {
        console.error('Error fetching survey submissions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Export survey submissions to Excel
// @route   GET /api/admin/surveys/:id/export
// @access  Private/Admin
export const exportSubmissionsToExcel = async (req: Request, res: Response) => {
    try {
        const surveyId = req.params.id;
        const survey = await Survey.findById(surveyId);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }

        const submissions = await SurveySubmission.find({ surveyId })
            .populate('userId', 'name email')
            .lean();

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet(`${survey.title.substring(0, 25)} Submissions`);

        // Define columns
        const columns = [
            { header: 'Submission ID', key: 'id', width: 30 },
            { header: 'User Name', key: 'userName', width: 20 },
            { header: 'User Email', key: 'userEmail', width: 30 },
            { header: 'Submission Date', key: 'submittedAt', width: 20 },
            { header: 'Is Fraudulent', key: 'isFraudulent', width: 15 },
            { header: 'Fraud Reason', key: 'fraudReason', width: 30 },
        ];

        survey.questions.forEach((question) => {
            columns.push({ header: question.text, key: question.id, width: 40 });
        });

        worksheet.columns = columns;

        // Add rows
        submissions.forEach(submission => {
            const row: any = {
                id: submission._id.toString(),
                userName: (submission.userId as any)?.name || 'N/A',
                userEmail: (submission.userId as any)?.email || 'N/A',
                submittedAt: submission.submittedAt,
                isFraudulent: submission.isFraudulent,
                fraudReason: submission.fraudReason,
            };

            submission.answers.forEach(answer => {
                const questionId = answer.questionId.toString();
                let answerText = answer.answer.join(', ');
                if (answer.otherText) {
                    answerText += ` (Other: ${answer.otherText})`;
                }
                row[questionId] = answerText;
            });
            
            worksheet.addRow(row);
        });

        // Sanitize the survey title for the filename
        const safeFileName = survey.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        // Set response headers to trigger file download
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="submissions_${safeFileName}.xlsx"`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting survey submissions:', error);
        res.status(500).json({ message: 'Server error during export.' });
    }
}; 