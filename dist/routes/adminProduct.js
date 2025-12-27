"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
// Images are uploaded via /api/cloudinary/signature and client uploads directly to Cloudinary.
const adminProduct_controller_1 = require("../controllers/adminProduct.controller");
const router = express_1.default.Router();
// All routes require admin authentication
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
// Product management routes
router.get('/', adminProduct_controller_1.getAllProducts);
router.get('/categories', adminProduct_controller_1.getProductCategories);
router.get('/:id', adminProduct_controller_1.getProductById);
router.post('/', adminProduct_controller_1.createProduct);
router.put('/:id', adminProduct_controller_1.updateProduct);
router.delete('/:id', adminProduct_controller_1.deleteProduct);
router.patch('/:id/toggle-status', adminProduct_controller_1.toggleProductStatus);
router.patch('/:id/stock', adminProduct_controller_1.updateProductStock);
router.get('/:id/inventory-history', adminProduct_controller_1.getInventoryHistory);
exports.default = router;
//# sourceMappingURL=adminProduct.js.map