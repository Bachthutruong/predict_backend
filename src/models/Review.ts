import mongoose, { Schema, models, model } from 'mongoose';

const ReviewSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    images: [{ type: String }], // Optional review images
    isAnonymous: { type: Boolean, default: false },

    // Admin reply
    reply: { type: String },
    repliedAt: { type: Date },
}, { timestamps: true });

// Prevent duplicate reviews from same user on same product (optional, but good practice)
// ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review = models?.Review || model('Review', ReviewSchema);
export default Review;
