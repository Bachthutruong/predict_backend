import express from 'express';
import {  authenticate, authorize } from '../middleware/auth';
import * as adminVotingController from '../controllers/adminVoting.controller';
import * as userVotingController from '../controllers/userVoting.controller';

// Optional auth middleware - doesn't require authentication but adds user data if available
const optionalAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      // If token exists, try to authenticate
      await authenticate(req, res, () => {});
    }
    // Continue regardless of authentication result
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Combined auth + admin middleware
const adminAuth = [authenticate, authorize(['admin'])];

const router = express.Router();

// =================== PUBLIC ROUTES (No auth required) ===================
// Get all active voting campaigns - public view
router.get('/campaigns', userVotingController.getActiveVotingCampaigns);

// Get single campaign details with entries - public view
router.get('/campaigns/:id', optionalAuth, userVotingController.getVotingCampaignDetail);

// =================== USER ROUTES (Auth required) ===================
// Vote for an entry
router.post('/campaigns/:campaignId/entries/:entryId/vote', authenticate, userVotingController.voteForEntry);

// Remove vote
router.delete('/campaigns/:campaignId/entries/:entryId/vote', authenticate, userVotingController.removeVote);

// Get user's voting history
router.get('/my-votes', authenticate, userVotingController.getUserVotingHistory);

// =================== ADMIN ROUTES (Admin auth required) ===================
// Campaign management
router.get('/admin/campaigns', adminAuth, adminVotingController.getVotingCampaigns);
router.get('/admin/campaigns/:id', adminAuth, adminVotingController.getVotingCampaign);
router.post('/admin/campaigns', adminAuth, adminVotingController.createVotingCampaign);
router.put('/admin/campaigns/:id', adminAuth, adminVotingController.updateVotingCampaign);
router.delete('/admin/campaigns/:id', adminAuth, adminVotingController.deleteVotingCampaign);

// Entry management
router.post('/admin/campaigns/:campaignId/entries', adminAuth, adminVotingController.addVoteEntry);
router.put('/admin/entries/:entryId', adminAuth, adminVotingController.updateVoteEntry);
router.delete('/admin/entries/:entryId', adminAuth, adminVotingController.deleteVoteEntry);

// Statistics
router.get('/admin/campaigns/:campaignId/statistics', adminAuth, adminVotingController.getVotingStatistics);

export default router; 