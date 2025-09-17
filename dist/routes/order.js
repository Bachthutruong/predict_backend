"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
// Payment images are uploaded by client to Cloudinary directly. API receives URL.
const order_controller_1 = require("../controllers/order.controller");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Order management routes
router.get('/', order_controller_1.getUserOrders);
router.get('/suggestion-packages', order_controller_1.getUserSuggestionPackages);
router.get('/:id', order_controller_1.getOrderById);
router.post('/', order_controller_1.createOrder);
router.post('/payment-confirmation', order_controller_1.submitPaymentConfirmation);
router.post('/:id/confirm-delivery', order_controller_1.confirmDelivery);
router.post('/:id/mark-delivered', order_controller_1.markDelivered);
router.post('/:id/cancel', order_controller_1.cancelOrder);
router.post('/purchase-suggestion-package', order_controller_1.purchaseSuggestionPackage);
router.post('/purchase-points', order_controller_1.purchasePoints);
exports.default = router;
//# sourceMappingURL=order.js.map