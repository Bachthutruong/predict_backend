"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SurveyOptionSchema = new mongoose_1.Schema({
    text: { type: String, required: true },
    antiFraudGroupId: { type: String },
});
const SurveyQuestionSchema = new mongoose_1.Schema({
    text: { type: String, required: true },
    type: {
        type: String,
        enum: ['short-text', 'long-text', 'single-choice', 'multiple-choice'],
        required: true
    },
    isRequired: { type: Boolean, default: false },
    options: [SurveyOptionSchema],
    isAntiFraud: { type: Boolean, default: false },
});
const SurveySchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'draft'
    },
    pointsAwarded: { type: Number, required: true, default: 0 },
    endDate: { type: Date },
    questions: [SurveyQuestionSchema],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
const Survey = (0, mongoose_1.model)('Survey', SurveySchema);
exports.default = Survey;
//# sourceMappingURL=survey.js.map