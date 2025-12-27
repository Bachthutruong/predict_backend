import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
// Images are uploaded via /api/cloudinary/signature and client uploads directly to Cloudinary.
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getProductCategories,
  updateProductStock,
  getInventoryHistory
} from '../controllers/adminProduct.controller';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(['admin']));

// Product management routes
router.get('/', getAllProducts);
router.get('/categories', getProductCategories);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/toggle-status', toggleProductStatus);
router.patch('/:id/stock', updateProductStock);
router.get('/:id/inventory-history', getInventoryHistory);

export default router;
