import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Review from '../models/Review';
import Product from '../models/Product';
import User from '../models/user';
import PointTransaction from '../models/point-transaction';
import SystemSettings from '../models/system-settings';

// Get reviews for a product
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

// Create a review
export const createReview = async (req: AuthRequest, res: Response) => {
    try {
        const { productId, rating, comment, images, isAnonymous } = req.body;
        const userId = req.user?.id;

        // Validate product
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        // Check if user already reviewed? Not enforcing yet but good to know

        const review = await Review.create({
            product: productId,
            user: userId,
            rating,
            comment,
            images,
            isAnonymous
        });

        // Award points
        try {
            const settings = await SystemSettings.findOne({ settingKey: 'reviewPoints' });
            const awardPoints = settings ? settings.settingValue : 0; // Default to 0 if not set, though we have defaults

            if (awardPoints > 0 && userId) {
                // Update user points
                await User.findByIdAndUpdate(userId, { $inc: { points: awardPoints } });

                // Create transaction record
                await PointTransaction.create({
                    userId,
                    amount: awardPoints,
                    reason: 'review-reward',
                    notes: `Reward for reviewing product: ${product.name}`
                });
            }
        } catch (pointError) {
            console.error('Error awarding points for review:', pointError);
            // Don't fail the request if point awarding fails
        }

        res.status(201).json({ success: true, data: review, message: 'Review submitted successfully!' });
    } catch (error) {
        console.error("Create review error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// --- Admin Functions ---

// Get all reviews (Admin)
export const getAllReviews = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 20, search = '', productId } = req.query;

        const query: any = {};
        if (productId) {
            query.product = productId;
        }
        if (search) {
            query.$or = [
                { comment: { $regex: search, $options: 'i' } }
                // Searching by user name or product name requires aggregation/population which is heavier
            ];
        }

        const reviews = await Review.find(query)
            .populate('user', 'name email avatar')
            .populate('product', 'name images')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await Review.countDocuments(query);

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
        console.error("Get all reviews error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Reply to a review (Admin)
export const replyReview = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reply } = req.body;

        const review = await Review.findByIdAndUpdate(
            id,
            { reply, repliedAt: new Date() },
            { new: true }
        );

        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        res.json({ success: true, data: review, message: 'Reply submitted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Toggle admin reaction (Admin)
export const toggleAdminReaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reaction } = req.body; // e.g., 'like', 'heart', or null to remove

        const review = await Review.findByIdAndUpdate(
            id,
            { adminReaction: reaction },
            { new: true }
        );

        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        res.json({ success: true, data: review });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Delete review (Admin)
export const deleteReview = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const review = await Review.findByIdAndDelete(id);

        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        res.json({ success: true, message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Update Review Reward Config (Admin)
export const updateReviewConfig = async (req: AuthRequest, res: Response) => {
    try {
        const { points } = req.body;

        if (typeof points !== 'number' || points < 0) {
            return res.status(400).json({ success: false, message: 'Invalid points value' });
        }

        const setting = await SystemSettings.findOneAndUpdate(
            { settingKey: 'reviewPoints' },
            { settingValue: points, description: 'Points awarded for submitting a product review' },
            { new: true, upsert: true }
        );

        res.json({ success: true, data: setting, message: 'Review reward settings updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get Review Reward Config (Admin)
export const getReviewConfig = async (req: AuthRequest, res: Response) => {
    try {
        let setting = await SystemSettings.findOne({ settingKey: 'reviewPoints' });
        if (!setting) {
            setting = await SystemSettings.create({
                settingKey: 'reviewPoints',
                settingValue: 50, // Default fallback
                description: 'Points awarded for submitting a product review'
            });
        }
        res.json({ success: true, data: setting });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
