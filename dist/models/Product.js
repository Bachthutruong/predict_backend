"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 }, // For showing discount
    images: [{ type: String, required: true }], // Array of image URLs
    category: { type: String, required: true, index: true },
    brand: { type: String, default: '' },
    sku: { type: String, unique: true, sparse: true, index: true },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    weight: { type: Number, default: 0 }, // in grams
    dimensions: {
        length: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 }
    },
    // Points system
    pointsReward: { type: Number, default: 0 }, // Points given when purchasing this product
    pointsRequired: { type: Number, default: 0 }, // Points needed to purchase (if using points)
    canPurchaseWithPoints: { type: Boolean, default: false },
    // SEO and metadata
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    tags: [{ type: String }],
    // Analytics
    viewCount: { type: Number, default: 0 },
    purchaseCount: { type: Number, default: 0 },
    // Product variants (size, color, etc.)
    variants: [{
            name: { type: String, required: true },
            value: { type: String, required: true },
            priceAdjustment: { type: Number, default: 0 },
            stock: { type: Number, default: 0 }
        }],
    // Shipping info
    freeShipping: { type: Boolean, default: false },
    shippingWeight: { type: Number, default: 0 },
    // Created by admin
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
// Indexes for better performance
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ price: 1, isActive: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.set('toJSON', {
    transform: (doc, ret) => {
        // Defensive: some projections or null-populated refs may yield missing _id
        if (ret && ret._id && typeof ret._id.toString === 'function') {
            ret.id = ret._id.toString();
            delete ret._id;
        }
        if (ret && ret.__v !== undefined) {
            delete ret.__v;
        }
    },
});
const Product = mongoose_1.models?.Product || (0, mongoose_1.model)('Product', ProductSchema);
exports.default = Product;
//# sourceMappingURL=Product.js.map