import mongoose, { Schema, models, model } from 'mongoose';

const PaymentConfigSchema = new Schema({
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

const PaymentConfig = models?.PaymentConfig || model('PaymentConfig', PaymentConfigSchema);
export default PaymentConfig;
