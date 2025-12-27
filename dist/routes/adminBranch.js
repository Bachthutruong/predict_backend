"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminBranch_controller_1 = require("../controllers/adminBranch.controller");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
router.get('/', adminBranch_controller_1.listBranches);
router.post('/', adminBranch_controller_1.createBranch);
router.get('/:id', adminBranch_controller_1.getBranchById);
router.put('/:id', adminBranch_controller_1.updateBranch);
router.delete('/:id', adminBranch_controller_1.deleteBranch);
exports.default = router;
//# sourceMappingURL=adminBranch.js.map