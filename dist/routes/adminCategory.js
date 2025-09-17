"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminCategory_controller_1 = require("../controllers/adminCategory.controller");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
router.get('/', adminCategory_controller_1.getCategories);
router.get('/:id', adminCategory_controller_1.getCategoryById);
router.post('/', adminCategory_controller_1.createCategory);
router.put('/:id', adminCategory_controller_1.updateCategory);
router.delete('/:id', adminCategory_controller_1.deleteCategory);
router.patch('/:id/toggle-status', adminCategory_controller_1.toggleCategoryStatus);
exports.default = router;
//# sourceMappingURL=adminCategory.js.map