"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SurveyAnswerSchema = new mongoose_1.Schema({
    questionId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    questionText: { type: String, required: true },
    questionType: { type: String, required: true },
    answer: [{ type: String }],
    otherText: { type: String },
}, { _id: false });
const SurveySubmissionSchema = new mongoose_1.Schema({
    surveyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Survey', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    answers: [SurveyAnswerSchema],
    isFraudulent: { type: Boolean, default: false },
    fraudReason: { type: String },
    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });
const SurveySubmission = (0, mongoose_1.model)('SurveySubmission', SurveySubmissionSchema);
exports.default = SurveySubmission;
//# sourceMappingURL=survey-submission.js.map