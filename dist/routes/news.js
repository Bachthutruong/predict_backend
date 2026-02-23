"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const news_controller_1 = require("../controllers/news.controller");
const router = express_1.default.Router();
router.get('/manage/all', auth_1.authenticate, auth_1.staffMiddleware, news_controller_1.getManageNewsList);
router.get('/manage/:id', auth_1.authenticate, auth_1.staffMiddleware, news_controller_1.getManageNewsById);
router.post('/manage', auth_1.authenticate, auth_1.staffMiddleware, news_controller_1.createNews);
router.put('/manage/:id', auth_1.authenticate, auth_1.staffMiddleware, news_controller_1.updateNews);
router.delete('/manage/:id', auth_1.authenticate, auth_1.staffMiddleware, news_controller_1.deleteNews);
router.get('/', news_controller_1.getNewsList);
router.get('/:slug', news_controller_1.getNewsBySlug);
exports.default = router;
//# sourceMappingURL=news.js.map