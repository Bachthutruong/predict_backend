"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSubmissionsToExcel = exports.getSurveySubmissions = exports.deleteSurvey = exports.updateSurvey = exports.getSurveyById = exports.getSurveys = exports.createSurvey = void 0;
const survey_1 = __importDefault(require("../models/survey"));
const survey_submission_1 = __importDefault(require("../models/survey-submission"));
const exceljs_1 = __importDefault(require("exceljs"));
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Create a new survey
// @route   POST /api/admin/surveys
// @access  Private/Admin
const createSurvey = async (req, res) => {
    const { title, description, pointsAwarded, endDate, questions, status, imageUrl } = req.body;
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
        if (!q.options || q.options.some((opt) => !opt.antiFraudGroupId)) {
            return res.status(400).json({ message: `All options for anti-fraud question "${q.text}" must have an Anti-Fraud Group ID.` });
        }
    }
    try {
        const survey = new survey_1.default({
            title,
            description,
            pointsAwarded,
            endDate,
            questions,
            status,
            imageUrl,
            createdBy: req.user.id, // Assuming user ID is available on request
        });
        const createdSurvey = await survey.save();
        res.status(201).json({ message: 'Survey created successfully', data: createdSurvey });
    }
    catch (error) {
        console.error('Error creating survey:', error);
        if (error instanceof mongoose_1.default.Error.ValidationError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        res.status(500).json({ message: 'Server error while creating survey.' });
    }
};
exports.createSurvey = createSurvey;
// @desc    Get all surveys
// @route   GET /api/admin/surveys
// @access  Private/Admin
const getSurveys = async (req, res) => {
    try {
        const surveys = await survey_1.default.find().sort({ createdAt: -1 });
        res.json({ message: 'Surveys fetched successfully', data: surveys });
    }
    catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getSurveys = getSurveys;
// @desc    Get a single survey by ID
// @route   GET /api/admin/surveys/:id
// @access  Private/Admin
const getSurveyById = async (req, res) => {
    try {
        const survey = await survey_1.default.findById(req.params.id);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }
        res.json({ message: 'Survey fetched successfully', data: survey });
    }
    catch (error) {
        console.error('Error fetching survey by ID:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getSurveyById = getSurveyById;
// @desc    Update a survey
// @route   PUT /api/admin/surveys/:id
// @access  Private/Admin
const updateSurvey = async (req, res) => {
    const { title, description, pointsAwarded, endDate, questions, status, imageUrl } = req.body;
    try {
        const survey = await survey_1.default.findById(req.params.id);
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
                if (!q.options || q.options.some((opt) => !opt.antiFraudGroupId)) {
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
    }
    catch (error) {
        console.error('Error updating survey:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateSurvey = updateSurvey;
// @desc    Delete a survey
// @route   DELETE /api/admin/surveys/:id
// @access  Private/Admin
const deleteSurvey = async (req, res) => {
    try {
        const survey = await survey_1.default.findById(req.params.id);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }
        // Also delete all submissions related to this survey
        await survey_submission_1.default.deleteMany({ surveyId: req.params.id });
        await survey.deleteOne();
        res.json({ message: 'Survey and all its submissions have been deleted.' });
    }
    catch (error) {
        console.error('Error deleting survey:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteSurvey = deleteSurvey;
// @desc    Get all submissions for a survey
// @route   GET /api/admin/surveys/:id/submissions
// @access  Private/Admin
const getSurveySubmissions = async (req, res) => {
    try {
        const submissions = await survey_submission_1.default.find({ surveyId: req.params.id })
            .populate('userId', 'name email')
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
    }
    catch (error) {
        console.error('Error fetching survey submissions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getSurveySubmissions = getSurveySubmissions;
// @desc    Export survey submissions to Excel
// @route   GET /api/admin/surveys/:id/export
// @access  Private/Admin
const exportSubmissionsToExcel = async (req, res) => {
    try {
        const surveyId = req.params.id;
        const survey = await survey_1.default.findById(surveyId);
        if (!survey) {
            return res.status(404).json({ message: 'Survey not found' });
        }
        const submissions = await survey_submission_1.default.find({ surveyId })
            .populate('userId', 'name email')
            .lean();
        const workbook = new exceljs_1.default.Workbook();
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
            const row = {
                id: submission._id.toString(),
                userName: submission.userId?.name || 'N/A',
                userEmail: submission.userId?.email || 'N/A',
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
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="submissions_${safeFileName}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error('Error exporting survey submissions:', error);
        res.status(500).json({ message: 'Server error during export.' });
    }
};
exports.exportSubmissionsToExcel = exportSubmissionsToExcel;
//# sourceMappingURL=adminSurvey.controller.js.map