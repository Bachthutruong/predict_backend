"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const PaymentConfigSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['bank_transfer'], required: true, unique: true },
    bankName: { type: String, default: '' },
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    qrCodeUrl: { type: String, default: '' }, // URL to image of QR
    isActive: { type: Boolean, default: true },
    instructions: { type: String, default: '' }
}, { timestamps: true });
PaymentConfigSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const PaymentConfig = mongoose_1.models?.PaymentConfig || (0, mongoose_1.model)('PaymentConfig', PaymentConfigSchema);
exports.default = PaymentConfig;
//# sourceMappingURL=PaymentConfig.js.map