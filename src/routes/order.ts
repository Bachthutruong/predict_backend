import express from 'express';
import { authenticate } from '../middleware/auth';
// Payment images are uploaded by client to Cloudinary directly. API receives URL.
import {
  getUserOrders,
  getOrderById,
  createOrder,
  submitPaymentConfirmation,
  confirmDelivery,
  markDelivered,
  cancelOrder,
  purchaseSuggestionPackage,
  getUserSuggestionPackages,
  purchasePoints
} from '../controllers/order.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Order management routes
router.get('/', getUserOrders);
router.get('/suggestion-packages', getUserSuggestionPackages);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.post('/payment-confirmation', submitPaymentConfirmation);
router.post('/:id/confirm-delivery', confirmDelivery);
router.post('/:id/mark-delivered', markDelivered);
router.post('/:id/cancel', cancelOrder);
router.post('/purchase-suggestion-package', purchaseSuggestionPackage);
router.post('/purchase-points', purchasePoints);

export default router;
