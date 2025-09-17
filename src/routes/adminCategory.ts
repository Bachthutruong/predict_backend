import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory, toggleCategoryStatus } from '../controllers/adminCategory.controller';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.patch('/:id/toggle-status', toggleCategoryStatus);

export default router;


