import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createContest,
  getContests,
  getContestById,
  updateContest,
  deleteContest,
  publishAnswer,
  getContestSubmissions,
  getContestStatistics
} from '../controllers/adminContest.controller';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new contest
router.post('/', createContest);

// Get all contests
router.get('/', getContests);

// Get a single contest by ID
router.get('/:id', getContestById);

// Update a contest
router.put('/:id', updateContest);

// Delete a contest
router.delete('/:id', deleteContest);

// Publish answer for a contest
router.put('/:id/publish-answer', publishAnswer);

// Get contest submissions
router.get('/:id/submissions', getContestSubmissions);

// Get contest statistics
router.get('/:id/statistics', getContestStatistics);

export default router; 