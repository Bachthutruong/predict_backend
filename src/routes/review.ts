import express from 'express';
import { authenticate } from '../middleware/auth';
import { getProductReviews, createReview } from '../controllers/review.controller';

const router = express.Router();

router.get('/product/:productId', getProductReviews);
router.post('/', authenticate, createReview);

export default router;
