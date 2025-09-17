import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon,
  getCouponStatistics
} from '../controllers/adminCoupon.controller';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(['admin']));

// Coupon management routes
router.get('/', getAllCoupons);
router.get('/statistics', getCouponStatistics);
router.get('/:id', getCouponById);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);
router.patch('/:id/toggle-status', toggleCouponStatus);
router.post('/validate', validateCoupon);

export default router;
