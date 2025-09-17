import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
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
router.use(authenticate);
router.use(authorize(['admin']));

// Create a new contest
router.post('/', authenticate, authorize(['admin']), createContest);

// Get all contests
router.get('/', authenticate, authorize(['admin']), getContests);

// Get a single contest by ID
router.get('/:id', authenticate, authorize(['admin']), getContestById);

// Update a contest
router.put('/:id', authenticate, authorize(['admin']), updateContest);

// Delete a contest
router.delete('/:id', authenticate, authorize(['admin']), deleteContest);

// Publish answer for a contest
router.put('/:id/publish-answer', authenticate, authorize(['admin']), publishAnswer);

// Get contest submissions
router.get('/:id/submissions', authenticate, authorize(['admin']), getContestSubmissions);

// Get contest statistics
router.get('/:id/statistics', authenticate, authorize(['admin']), getContestStatistics);

export default router; 