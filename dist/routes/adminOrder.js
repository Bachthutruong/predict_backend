"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminOrder_controller_1 = require("../controllers/adminOrder.controller");
const router = express_1.default.Router();
// All routes require admin authentication
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
// Order management routes
router.get('/', adminOrder_controller_1.getAllOrders);
router.get('/statistics', adminOrder_controller_1.getOrderStatistics);
router.get('/:id', adminOrder_controller_1.getOrderById);
router.patch('/:id/status', adminOrder_controller_1.updateOrderStatus);
router.patch('/:id/payment-status', adminOrder_controller_1.updatePaymentStatus);
router.patch('/:id/tracking', adminOrder_controller_1.addTrackingNumber);
router.patch('/:id/cancel', adminOrder_controller_1.cancelOrder);
exports.default = router;
//# sourceMappingURL=adminOrder.js.map