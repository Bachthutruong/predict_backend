import express from 'express';
import { optionalAuthenticate } from '../middleware/auth';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon
} from '../controllers/cart.controller';

const router = express.Router();

// Cart routes work with or without authentication (guest users supported)
router.use(optionalAuthenticate);

// Cart management routes
router.get('/', getCart);
router.post('/add', addToCart);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.delete('/clear', clearCart);
router.post('/apply-coupon', applyCoupon);
router.delete('/remove-coupon', removeCoupon);

export default router;
