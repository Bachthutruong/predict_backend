"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const SystemOrderItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, default: '' },
    image: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
});
const SystemOrderSchema = new mongoose_1.Schema({
    orderNumber: { type: String, unique: true, index: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    // Distinguish order purpose for clearer filtering in UI/APIs
    orderType: { type: String, enum: ['shop', 'points_topup', 'suggestion_package'], default: 'shop', index: true },
    items: [SystemOrderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    // Points
    pointsUsed: { type: Number, default: 0 },
    pointsEarned: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    paymentMethod: { type: String, enum: ['bank_transfer', 'cod'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'waiting_confirmation', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
    status: { type: String, enum: ['pending', 'waiting_payment', 'waiting_confirmation', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'], default: 'pending', index: true },
    shippingAddress: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
        notes: { type: String, default: '' }
    },
    trackingNumber: { type: String, default: '' },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    paymentConfirmation: {
        image: { type: String, default: '' },
        note: { type: String, default: '' },
        submittedAt: { type: Date }
    },
    adminNotes: { type: String, default: '' },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, default: '' },
}, { timestamps: true, strictPopulate: false });
SystemOrderSchema.pre('save', function (next) {
    if (!this.orderNumber) {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.orderNumber = `SYS${timestamp}${random}`;
    }
    next();
});
SystemOrderSchema.index({ user: 1, createdAt: -1 });
SystemOrderSchema.index({ status: 1, createdAt: -1 });
SystemOrderSchema.index({ paymentStatus: 1, status: 1 });
SystemOrderSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const SystemOrder = mongoose_1.models?.SystemOrder || (0, mongoose_1.model)('SystemOrder', SystemOrderSchema);
exports.default = SystemOrder;
//# sourceMappingURL=SystemOrder.js.map