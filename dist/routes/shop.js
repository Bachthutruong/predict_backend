"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shop_controller_1 = require("../controllers/shop.controller");
const router = express_1.default.Router();
// Public shop routes
router.get('/products', shop_controller_1.getShopProducts);
router.get('/products/search', shop_controller_1.searchProducts);
router.get('/products/featured', shop_controller_1.getFeaturedProducts);
router.get('/products/categories', shop_controller_1.getProductCategories);
router.get('/categories', shop_controller_1.getProductCategories);
router.get('/products/:id', shop_controller_1.getShopProductById);
router.get('/suggestion-packages', shop_controller_1.getSuggestionPackages);
router.post('/coupons/validate', shop_controller_1.validateCoupon);
router.get('/branches', shop_controller_1.getBranches);
router.get('/payment-cfg', shop_controller_1.getPaymentConfig);
exports.default = router;
//# sourceMappingURL=shop.js.map