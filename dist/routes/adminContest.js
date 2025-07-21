"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminContest_controller_1 = require("../controllers/adminContest.controller");
const router = express_1.default.Router();
// Apply auth middleware to all routes
router.use(auth_1.authMiddleware);
// Create a new contest
router.post('/', adminContest_controller_1.createContest);
// Get all contests
router.get('/', adminContest_controller_1.getContests);
// Get a single contest by ID
router.get('/:id', adminContest_controller_1.getContestById);
// Update a contest
router.put('/:id', adminContest_controller_1.updateContest);
// Delete a contest
router.delete('/:id', adminContest_controller_1.deleteContest);
// Publish answer for a contest
router.put('/:id/publish-answer', adminContest_controller_1.publishAnswer);
// Get contest submissions
router.get('/:id/submissions', adminContest_controller_1.getContestSubmissions);
// Get contest statistics
router.get('/:id/statistics', adminContest_controller_1.getContestStatistics);
exports.default = router;
//# sourceMappingURL=adminContest.js.map