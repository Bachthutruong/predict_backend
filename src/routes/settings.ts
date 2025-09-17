import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getPointPricePublic, getPointPriceAdmin, updatePointPriceAdmin } from '../controllers/settings.controller';

const router = express.Router();

// Public endpoint to get point price
router.get('/point-price', getPointPricePublic);

// Admin endpoints
router.get('/admin/point-price', authenticate, authorize(['admin']), getPointPriceAdmin);
router.put('/admin/point-price', authenticate, authorize(['admin']), updatePointPriceAdmin);

export default router;


