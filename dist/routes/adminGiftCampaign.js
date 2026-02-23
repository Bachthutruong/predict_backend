"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminGiftCampaign_controller_1 = require("../controllers/adminGiftCampaign.controller");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
router.get('/', adminGiftCampaign_controller_1.getGiftCampaigns);
router.get('/:id', adminGiftCampaign_controller_1.getGiftCampaignById);
router.post('/', adminGiftCampaign_controller_1.createGiftCampaign);
router.put('/:id', adminGiftCampaign_controller_1.updateGiftCampaign);
router.delete('/:id', adminGiftCampaign_controller_1.deleteGiftCampaign);
exports.default = router;
//# sourceMappingURL=adminGiftCampaign.js.map