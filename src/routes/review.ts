import express from 'express';
import { authenticate } from '../middleware/auth';
import {
    getProductReviews,
    createReview,
    getAllReviews,
    replyReview,
    deleteReview,
    updateReviewConfig,
    getReviewConfig,
    toggleAdminReaction
} from '../controllers/review.controller';

const router = express.Router();

// Public / User routes
router.get('/product/:productId', getProductReviews);
router.post('/', authenticate, createReview);

// Admin routes (should verify admin role in a real app, assuming simple auth for now or handle in controller)
// Ideally: router.use(authenticate, requireAdmin)

// Get review settings
router.get('/config', authenticate, getReviewConfig);
router.put('/config', authenticate, updateReviewConfig);

// Admin manage reviews
router.get('/admin/all', authenticate, getAllReviews);
router.post('/:id/reply', authenticate, replyReview);
router.put('/:id/reaction', authenticate, toggleAdminReaction);
router.delete('/:id', authenticate, deleteReview);

export default router;
