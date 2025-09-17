"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const settings_controller_1 = require("../controllers/settings.controller");
const router = express_1.default.Router();
// Public endpoint to get point price
router.get('/point-price', settings_controller_1.getPointPricePublic);
// Admin endpoints
router.get('/admin/point-price', auth_1.authenticate, (0, auth_1.authorize)(['admin']), settings_controller_1.getPointPriceAdmin);
router.put('/admin/point-price', auth_1.authenticate, (0, auth_1.authorize)(['admin']), settings_controller_1.updatePointPriceAdmin);
exports.default = router;
//# sourceMappingURL=settings.js.map