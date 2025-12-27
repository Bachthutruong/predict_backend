"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReview = exports.getProductReviews = void 0;
const Review_1 = __importDefault(require("../models/Review"));
const Product_1 = __importDefault(require("../models/Product"));
// import Order from '../models/Order'; // Could check if user purchased
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
const createReview = async (req, res) => {
    try {
        const { productId, rating, comment, images, isAnonymous } = req.body;
        // Validate product
        const product = await Product_1.default.findById(productId);
        if (!product)
            return res.status(404).json({ success: false, message: 'Product not found' });
        // TODO: Ideally check if user bought product here
        const review = await Review_1.default.create({
            product: productId,
            user: req.user?.id,
            rating,
            comment,
            images,
            isAnonymous
        });
        res.status(201).json({ success: true, data: review });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createReview = createReview;
//# sourceMappingURL=review.controller.js.map