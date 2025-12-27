import express from 'express';
import {
  getShopProducts,
  getShopProductById,
  getProductCategories,
  getFeaturedProducts,
  getSuggestionPackages,
  validateCoupon,

  searchProducts,
  getBranches,
  getPaymentConfig
} from '../controllers/shop.controller';

const router = express.Router();

// Public shop routes
router.get('/products', getShopProducts);
router.get('/products/search', searchProducts);
router.get('/products/featured', getFeaturedProducts);
router.get('/products/categories', getProductCategories);
router.get('/categories', getProductCategories);
router.get('/products/:id', getShopProductById);
router.get('/suggestion-packages', getSuggestionPackages);
router.post('/coupons/validate', validateCoupon);
router.get('/branches', getBranches);
router.get('/payment-cfg', getPaymentConfig);

export default router;
