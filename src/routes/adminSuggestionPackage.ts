import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllSuggestionPackages,
  getSuggestionPackageById,
  createSuggestionPackage,
  updateSuggestionPackage,
  deleteSuggestionPackage,
  toggleSuggestionPackageStatus,
  updateSortOrder,
  getSuggestionPackageStatistics
} from '../controllers/adminSuggestionPackage.controller';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(['admin']));

// Suggestion package management routes
router.get('/', getAllSuggestionPackages);
router.get('/statistics', getSuggestionPackageStatistics);
router.get('/:id', getSuggestionPackageById);
router.post('/', createSuggestionPackage);
router.put('/:id', updateSuggestionPackage);
router.delete('/:id', deleteSuggestionPackage);
router.patch('/:id/toggle-status', toggleSuggestionPackageStatus);
router.patch('/sort-order', updateSortOrder);

export default router;
