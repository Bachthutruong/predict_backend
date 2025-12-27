"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const review_controller_1 = require("../controllers/review.controller");
const router = express_1.default.Router();
// Public / User routes
router.get('/product/:productId', review_controller_1.getProductReviews);
router.post('/', auth_1.authenticate, review_controller_1.createReview);
// Admin routes (should verify admin role in a real app, assuming simple auth for now or handle in controller)
// Ideally: router.use(authenticate, requireAdmin)
// Get review settings
router.get('/config', auth_1.authenticate, review_controller_1.getReviewConfig);
router.put('/config', auth_1.authenticate, review_controller_1.updateReviewConfig);
// Admin manage reviews
router.get('/admin/all', auth_1.authenticate, review_controller_1.getAllReviews);
router.post('/:id/reply', auth_1.authenticate, review_controller_1.replyReview);
router.put('/:id/reaction', auth_1.authenticate, review_controller_1.toggleAdminReaction);
router.delete('/:id', auth_1.authenticate, review_controller_1.deleteReview);
exports.default = router;
//# sourceMappingURL=review.js.map