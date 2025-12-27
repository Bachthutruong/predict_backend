"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const chat_controller_1 = require("../controllers/chat.controller");
const router = express_1.default.Router();
router.get('/', auth_1.authenticate, chat_controller_1.getMyChat);
router.post('/', auth_1.authenticate, chat_controller_1.sendMessage);
// Admin Routes
router.get('/conversations', auth_1.authenticate, chat_controller_1.getConversations);
router.get('/user/:userId', auth_1.authenticate, chat_controller_1.getAdminChatWithUser);
router.post('/user/:userId', auth_1.authenticate, chat_controller_1.sendAdminMessage);
exports.default = router;
//# sourceMappingURL=chat.js.map