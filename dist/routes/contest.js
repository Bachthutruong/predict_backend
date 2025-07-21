"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const userContest_controller_1 = require("../controllers/userContest.controller");
const router = express_1.default.Router();
// Public routes - no authentication required
// Get all active contests
router.get('/', userContest_controller_1.getActiveContests);
// Get user's contest history
router.get('/history', auth_1.authMiddleware, userContest_controller_1.getContestHistory);
// Get contest details (public view)
router.get('/:id', userContest_controller_1.getContestDetails);
// Protected routes - authentication required
// Submit answer to contest
router.post('/:id/submit', auth_1.authMiddleware, userContest_controller_1.submitContestAnswer);
exports.default = router;
//# sourceMappingURL=contest.js.map