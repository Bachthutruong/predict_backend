"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CheckInSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Question', required: true },
    answer: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    pointsEarned: { type: Number, required: true },
    checkInDate: { type: Date, default: Date.now },
}, { timestamps: true });
// Ensure only one check-in per user per day
CheckInSchema.index({ userId: 1, checkInDate: 1 }, {
    unique: true,
    partialFilterExpression: {
        checkInDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
    }
});
CheckInSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const CheckIn = mongoose_1.models?.CheckIn || (0, mongoose_1.model)('CheckIn', CheckInSchema);
exports.default = CheckIn;
//# sourceMappingURL=check-in.js.map