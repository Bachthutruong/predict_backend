import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getActiveContests,
  getContestDetails,
  submitContestAnswer,
  getContestHistory
} from '../controllers/userContest.controller';

const router = express.Router();

// Public routes - no authentication required
// Get all active contests
router.get('/', getActiveContests);

// Get user's contest history
router.get('/history', authMiddleware, getContestHistory);

// Get contest details (public view)
router.get('/:id', getContestDetails);

// Protected routes - authentication required
// Submit answer to contest
router.post('/:id/submit', authMiddleware, submitContestAnswer);

export default router; 