"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminVotingController = __importStar(require("../controllers/adminVoting.controller"));
const userVotingController = __importStar(require("../controllers/userVoting.controller"));
// Optional auth middleware - doesn't require authentication but adds user data if available
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            // If token exists, try to authenticate
            await (0, auth_1.authMiddleware)(req, res, () => { });
        }
        // Continue regardless of authentication result
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
// Combined auth + admin middleware
const adminAuth = [auth_1.authMiddleware, auth_1.adminMiddleware];
const router = express_1.default.Router();
// =================== PUBLIC ROUTES (No auth required) ===================
// Get all active voting campaigns - public view
router.get('/campaigns', userVotingController.getActiveVotingCampaigns);
// Get single campaign details with entries - public view
router.get('/campaigns/:id', optionalAuth, userVotingController.getVotingCampaignDetail);
// =================== USER ROUTES (Auth required) ===================
// Vote for an entry
router.post('/campaigns/:campaignId/entries/:entryId/vote', auth_1.authMiddleware, userVotingController.voteForEntry);
// Remove vote
router.delete('/campaigns/:campaignId/entries/:entryId/vote', auth_1.authMiddleware, userVotingController.removeVote);
// Get user's voting history
router.get('/my-votes', auth_1.authMiddleware, userVotingController.getUserVotingHistory);
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
exports.default = router;
//# sourceMappingURL=voting.js.map