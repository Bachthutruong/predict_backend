import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Review from '../models/Review';
import Product from '../models/Product';
// import Order from '../models/Order'; // Could check if user purchased

export const getProductReviews = async (req: AuthRequest, res: Response) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({ product: productId })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await Review.countDocuments({ product: productId });

        res.json({
            success: true,
            data: reviews,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createReview = async (req: AuthRequest, res: Response) => {
    try {
        const { productId, rating, comment, images, isAnonymous } = req.body;

        // Validate product
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        // TODO: Ideally check if user bought product here

        const review = await Review.create({
            product: productId,
            user: req.user?.id,
            rating,
            comment,
            images,
            isAnonymous
        });

        res.status(201).json({ success: true, data: review });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
