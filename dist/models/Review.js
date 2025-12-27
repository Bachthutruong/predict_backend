"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ReviewSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    images: [{ type: String }], // Optional review images
    isAnonymous: { type: Boolean, default: false },
    // Admin reply
    reply: { type: String },
    repliedAt: { type: Date },
    adminReaction: { type: String }, // 'like', 'love', etc.
}, { timestamps: true });
// Prevent duplicate reviews from same user on same product (optional, but good practice)
// ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
const Review = mongoose_1.models?.Review || (0, mongoose_1.model)('Review', ReviewSchema);
exports.default = Review;
//# sourceMappingURL=Review.js.map