"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminSystemOrder_controller_1 = require("../controllers/adminSystemOrder.controller");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
router.get('/', adminSystemOrder_controller_1.listSystemOrders);
// Place statistics before dynamic :id to avoid shadowing
router.get('/statistics', adminSystemOrder_controller_1.getSystemOrderStatistics);
router.get('/:id', adminSystemOrder_controller_1.getSystemOrderById);
router.post('/', adminSystemOrder_controller_1.createSystemOrder);
router.put('/:id', adminSystemOrder_controller_1.updateSystemOrder);
router.delete('/:id', adminSystemOrder_controller_1.deleteSystemOrder);
router.patch('/:id/status', adminSystemOrder_controller_1.updateSystemOrderStatus);
router.patch('/:id/payment-status', adminSystemOrder_controller_1.updateSystemPaymentStatus);
exports.default = router;
//# sourceMappingURL=adminSystemOrder.js.map