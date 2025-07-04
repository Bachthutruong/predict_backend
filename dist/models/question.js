"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const QuestionSchema = new mongoose_1.Schema({
    questionText: { type: String, required: true },
    imageUrl: { type: String },
    answer: { type: String, required: true },
    isPriority: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    displayCount: { type: Number, default: 0, index: true },
    correctAnswerCount: { type: Number, default: 0 },
    points: { type: Number, required: true, index: true },
}, { timestamps: true });
// Compound indexes for better query performance
QuestionSchema.index({ status: 1, isPriority: -1 });
QuestionSchema.index({ status: 1, createdAt: -1 });
QuestionSchema.index({ displayCount: -1, correctAnswerCount: -1 });
QuestionSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const Question = mongoose_1.models?.Question || (0, mongoose_1.model)('Question', QuestionSchema);
exports.default = Question;
//# sourceMappingURL=question.js.map