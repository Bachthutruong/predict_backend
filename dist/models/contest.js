"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ContestSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: false },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    pointsPerAnswer: { type: Number, required: true }, // Số điểm cho mỗi lượt trả lời
    rewardPoints: { type: Number, required: true }, // Số điểm thưởng khi trả lời chính xác
    answer: { type: String, default: null }, // Đáp án sẽ được cập nhật sau
    isAnswerPublished: { type: Boolean, default: false }, // Trạng thái công bố đáp án
    status: { type: String, enum: ['active', 'finished', 'draft'], default: 'draft' },
    authorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
// Add indexes for better performance
ContestSchema.index({ status: 1, createdAt: -1 });
ContestSchema.index({ authorId: 1 });
ContestSchema.index({ startDate: 1, endDate: 1 });
ContestSchema.index({ isAnswerPublished: 1 });
// Add a toJSON transform to convert _id to id
ContestSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const Contest = mongoose_1.models.Contest || (0, mongoose_1.model)('Contest', ContestSchema);
exports.default = Contest;
//# sourceMappingURL=contest.js.map