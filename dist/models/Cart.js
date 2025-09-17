"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const CartItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    variant: {
        name: { type: String, default: '' },
        value: { type: String, default: '' }
    },
    addedAt: { type: Date, default: Date.now }
});
const CartSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [CartItemSchema],
    coupon: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });
// Update lastUpdated when cart is modified
CartSchema.pre('save', function (next) {
    this.lastUpdated = new Date();
    next();
});
// Indexes for better performance
CartSchema.index({ user: 1 });
CartSchema.index({ lastUpdated: -1 });
CartSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});
const Cart = mongoose_1.models?.Cart || (0, mongoose_1.model)('Cart', CartSchema);
exports.default = Cart;
//# sourceMappingURL=Cart.js.map