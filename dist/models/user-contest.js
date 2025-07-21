"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserContestSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    contestId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Contest', required: true },
    answer: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
    pointsSpent: { type: Number, required: true },
    rewardPointsEarned: { type: Number, default: 0 }, // Số điểm thưởng nhận được
}, { timestamps: true });
// Add indexes for better performance
UserContestSchema.index({ contestId: 1, createdAt: -1 });
UserContestSchema.index({ userId: 1 });
UserContestSchema.index({ isCorrect: 1 });
// Allow multiple submissions from the same user
// UserContestSchema.index({ userId: 1, contestId: 1 }, { unique: true });
UserContestSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const UserContest = mongoose_1.models.UserContest || (0, mongoose_1.model)('UserContest', UserContestSchema);
exports.default = UserContest;
//# sourceMappingURL=user-contest.js.map