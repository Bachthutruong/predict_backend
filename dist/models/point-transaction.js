"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const PointTransactionSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    adminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    amount: { type: Number, required: true, index: true },
    reason: {
        type: String,
        enum: ['check-in', 'referral', 'feedback', 'prediction-win', 'admin-grant', 'streak-bonus', 'survey-completion', 'order-completion', 'vote', 'vote-removal'],
        required: true,
        index: true,
    },
    notes: { type: String },
}, { timestamps: true });
// Compound indexes for better query performance
PointTransactionSchema.index({ userId: 1, createdAt: -1 });
PointTransactionSchema.index({ amount: 1, reason: 1 });
PointTransactionSchema.index({ createdAt: -1, reason: 1 });
PointTransactionSchema.index({ userId: 1, reason: 1, createdAt: -1 });
PointTransactionSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const PointTransaction = mongoose_1.models?.PointTransaction || (0, mongoose_1.model)('PointTransaction', PointTransactionSchema);
exports.default = PointTransaction;
//# sourceMappingURL=point-transaction.js.map