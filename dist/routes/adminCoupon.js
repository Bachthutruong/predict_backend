"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminCoupon_controller_1 = require("../controllers/adminCoupon.controller");
const router = express_1.default.Router();
// All routes require admin authentication
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
// Coupon management routes
router.get('/', adminCoupon_controller_1.getAllCoupons);
router.get('/statistics', adminCoupon_controller_1.getCouponStatistics);
router.get('/:id', adminCoupon_controller_1.getCouponById);
router.post('/', adminCoupon_controller_1.createCoupon);
router.put('/:id', adminCoupon_controller_1.updateCoupon);
router.delete('/:id', adminCoupon_controller_1.deleteCoupon);
router.patch('/:id/toggle-status', adminCoupon_controller_1.toggleCouponStatus);
router.post('/validate', adminCoupon_controller_1.validateCoupon);
exports.default = router;
//# sourceMappingURL=adminCoupon.js.map