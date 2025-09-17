import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  addTrackingNumber,
  getOrderStatistics,
  cancelOrder
} from '../controllers/adminOrder.controller';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(['admin']));

// Order management routes
router.get('/', getAllOrders);
router.get('/statistics', getOrderStatistics);
router.get('/:id', getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.patch('/:id/payment-status', updatePaymentStatus);
router.patch('/:id/tracking', addTrackingNumber);
router.patch('/:id/cancel', cancelOrder);

export default router;
