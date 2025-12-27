"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const review_controller_1 = require("../controllers/review.controller");
const router = express_1.default.Router();
router.get('/product/:productId', review_controller_1.getProductReviews);
router.post('/', auth_1.authenticate, review_controller_1.createReview);
exports.default = router;
//# sourceMappingURL=review.js.map