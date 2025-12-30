"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const cart_controller_1 = require("../controllers/cart.controller");
const router = express_1.default.Router();
// Cart routes work with or without authentication (guest users supported)
router.use(auth_1.optionalAuthenticate);
// Cart management routes
router.get('/', cart_controller_1.getCart);
router.post('/add', cart_controller_1.addToCart);
router.put('/items/:itemId', cart_controller_1.updateCartItem);
router.delete('/items/:itemId', cart_controller_1.removeFromCart);
router.delete('/clear', cart_controller_1.clearCart);
router.post('/apply-coupon', cart_controller_1.applyCoupon);
router.delete('/remove-coupon', cart_controller_1.removeCoupon);
exports.default = router;
//# sourceMappingURL=cart.js.map