"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const FeedbackSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    feedbackText: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    awardedPoints: { type: Number },
}, { timestamps: true });
FeedbackSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const Feedback = mongoose_1.models?.Feedback || (0, mongoose_1.model)('Feedback', FeedbackSchema);
exports.default = Feedback;
//# sourceMappingURL=feedback.js.map