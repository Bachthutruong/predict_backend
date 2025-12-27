"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminPaymentConfig_controller_1 = require("../controllers/adminPaymentConfig.controller");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
router.get('/', adminPaymentConfig_controller_1.getPaymentConfig);
router.put('/', adminPaymentConfig_controller_1.updatePaymentConfig);
exports.default = router;
//# sourceMappingURL=adminPaymentConfig.js.map