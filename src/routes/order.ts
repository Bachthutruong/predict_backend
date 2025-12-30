import express from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
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

// Create order allows guest checkout (optional auth)
router.post('/', optionalAuthenticate, createOrder);

// Get order by ID allows guest access (optional auth)
router.get('/:id', optionalAuthenticate, getOrderById);

// All other routes require authentication
router.use(authenticate);

// Order management routes
router.get('/', getUserOrders);
router.get('/suggestion-packages', getUserSuggestionPackages);
router.post('/payment-confirmation', submitPaymentConfirmation);
router.post('/:id/confirm-delivery', confirmDelivery);
router.post('/:id/mark-delivered', markDelivered);
router.post('/:id/cancel', cancelOrder);
router.post('/purchase-suggestion-package', purchaseSuggestionPackage);
router.post('/purchase-points', purchasePoints);

export default router;
