"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ReferralSchema = new mongoose_1.Schema({
    referrerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    referredUserId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
}, { timestamps: true });
ReferralSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const Referral = mongoose_1.models?.Referral || (0, mongoose_1.model)('Referral', ReferralSchema);
exports.default = Referral;
//# sourceMappingURL=referral.js.map