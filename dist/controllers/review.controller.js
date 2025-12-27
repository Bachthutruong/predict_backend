"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewConfig = exports.updateReviewConfig = exports.deleteReview = exports.toggleAdminReaction = exports.replyReview = exports.getAllReviews = exports.createReview = exports.getProductReviews = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Product_1 = __importDefault(require("../models/Product"));
const user_1 = __importDefault(require("../models/user"));
const point_transaction_1 = __importDefault(require("../models/point-transaction"));
const system_settings_1 = __importDefault(require("../models/system-settings"));
// Get reviews for a product
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const reviews = await Review_1.default.find({ product: productId })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Review_1.default.countDocuments({ product: productId });
        res.json({
            success: true,
            data: reviews,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getProductReviews = getProductReviews;
// Create a review
const createReview = async (req, res) => {
    try {
        const { productId, rating, comment, images, isAnonymous } = req.body;
        const userId = req.user?.id;
        // Validate product
        const product = await Product_1.default.findById(productId);
        if (!product)
            return res.status(404).json({ success: false, message: 'Product not found' });
        // Check if user already reviewed? Not enforcing yet but good to know
        const review = await Review_1.default.create({
            product: productId,
            user: userId,
            rating,
            comment,
            images,
            isAnonymous
        });
        // Award points
        try {
            const settings = await system_settings_1.default.findOne({ settingKey: 'reviewPoints' });
            const awardPoints = settings ? settings.settingValue : 0; // Default to 0 if not set, though we have defaults
            if (awardPoints > 0 && userId) {
                // Update user points
                await user_1.default.findByIdAndUpdate(userId, { $inc: { points: awardPoints } });
                // Create transaction record
                await point_transaction_1.default.create({
                    userId,
                    amount: awardPoints,
                    reason: 'review-reward',
                    notes: `Reward for reviewing product: ${product.name}`
                });
            }
        }
        catch (pointError) {
            console.error('Error awarding points for review:', pointError);
            // Don't fail the request if point awarding fails
        }
        res.status(201).json({ success: true, data: review, message: 'Review submitted successfully!' });
    }
    catch (error) {
        console.error("Create review error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createReview = createReview;
// --- Admin Functions ---
// Get all reviews (Admin)
const getAllReviews = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', productId } = req.query;
        const query = {};
        if (productId) {
            query.product = productId;
        }
        if (search) {
            query.$or = [
                { comment: { $regex: search, $options: 'i' } }
                // Searching by user name or product name requires aggregation/population which is heavier
            ];
        }
        const reviews = await Review_1.default.find(query)
            .populate('user', 'name email avatar')
            .populate('product', 'name images')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Review_1.default.countDocuments(query);
        res.json({
            success: true,
            data: reviews,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        console.error("Get all reviews error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAllReviews = getAllReviews;
// Reply to a review (Admin)
const replyReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;
        const review = await Review_1.default.findByIdAndUpdate(id, { reply, repliedAt: new Date() }, { new: true });
        if (!review)
            return res.status(404).json({ success: false, message: 'Review not found' });
        res.json({ success: true, data: review, message: 'Reply submitted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.replyReview = replyReview;
// Toggle admin reaction (Admin)
const toggleAdminReaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { reaction } = req.body; // e.g., 'like', 'heart', or null to remove
        const review = await Review_1.default.findByIdAndUpdate(id, { adminReaction: reaction }, { new: true });
        if (!review)
            return res.status(404).json({ success: false, message: 'Review not found' });
        res.json({ success: true, data: review });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.toggleAdminReaction = toggleAdminReaction;
// Delete review (Admin)
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review_1.default.findByIdAndDelete(id);
        if (!review)
            return res.status(404).json({ success: false, message: 'Review not found' });
        res.json({ success: true, message: 'Review deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.deleteReview = deleteReview;
// Update Review Reward Config (Admin)
const updateReviewConfig = async (req, res) => {
    try {
        const { points } = req.body;
        if (typeof points !== 'number' || points < 0) {
            return res.status(400).json({ success: false, message: 'Invalid points value' });
        }
        const setting = await system_settings_1.default.findOneAndUpdate({ settingKey: 'reviewPoints' }, { settingValue: points, description: 'Points awarded for submitting a product review' }, { new: true, upsert: true });
        res.json({ success: true, data: setting, message: 'Review reward settings updated' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateReviewConfig = updateReviewConfig;
// Get Review Reward Config (Admin)
const getReviewConfig = async (req, res) => {
    try {
        let setting = await system_settings_1.default.findOne({ settingKey: 'reviewPoints' });
        if (!setting) {
            setting = await system_settings_1.default.create({
                settingKey: 'reviewPoints',
                settingValue: 50, // Default fallback
                description: 'Points awarded for submitting a product review'
            });
        }
        res.json({ success: true, data: setting });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getReviewConfig = getReviewConfig;
//# sourceMappingURL=review.controller.js.map