"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminSuggestionPackage_controller_1 = require("../controllers/adminSuggestionPackage.controller");
const router = express_1.default.Router();
// All routes require admin authentication
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)(['admin']));
// Suggestion package management routes
router.get('/', adminSuggestionPackage_controller_1.getAllSuggestionPackages);
router.get('/statistics', adminSuggestionPackage_controller_1.getSuggestionPackageStatistics);
router.get('/:id', adminSuggestionPackage_controller_1.getSuggestionPackageById);
router.post('/', adminSuggestionPackage_controller_1.createSuggestionPackage);
router.put('/:id', adminSuggestionPackage_controller_1.updateSuggestionPackage);
router.delete('/:id', adminSuggestionPackage_controller_1.deleteSuggestionPackage);
router.patch('/:id/toggle-status', adminSuggestionPackage_controller_1.toggleSuggestionPackageStatus);
router.patch('/sort-order', adminSuggestionPackage_controller_1.updateSortOrder);
exports.default = router;
//# sourceMappingURL=adminSuggestionPackage.js.map