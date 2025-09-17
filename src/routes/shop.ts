import express from 'express';
import {
  getShopProducts,
  getShopProductById,
  getProductCategories,
  getFeaturedProducts,
  getSuggestionPackages,
  validateCoupon,
  searchProducts
} from '../controllers/shop.controller';

const router = express.Router();

// Public shop routes
router.get('/products', getShopProducts);
router.get('/products/search', searchProducts);
router.get('/products/featured', getFeaturedProducts);
router.get('/products/categories', getProductCategories);
router.get('/products/:id', getShopProductById);
router.get('/suggestion-packages', getSuggestionPackages);
router.post('/coupons/validate', validateCoupon);

export default router;
