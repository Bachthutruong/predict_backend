"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const adminSurvey_controller_1 = require("../controllers/adminSurvey.controller");
const userSurvey_controller_1 = require("../controllers/userSurvey.controller");
const auth_1 = require("../middleware/auth");
// --- PUBLIC ROUTES (no auth required) ---
router.route('/public')
    .get(userSurvey_controller_1.getPublishedSurveys);
router.route('/public/:id')
    .get(userSurvey_controller_1.getSurveyToFill);
// --- ADMIN ROUTES ---
router.route('/admin')
    .post(auth_1.authenticate, (0, auth_1.authorize)(['admin']), adminSurvey_controller_1.createSurvey)
    .get(auth_1.authenticate, (0, auth_1.authorize)(['admin']), adminSurvey_controller_1.getSurveys);
router.route('/admin/:id')
    .get(auth_1.authenticate, (0, auth_1.authorize)(['admin']), adminSurvey_controller_1.getSurveyById)
    .put(auth_1.authenticate, (0, auth_1.authorize)(['admin']), adminSurvey_controller_1.updateSurvey)
    .delete(auth_1.authenticate, (0, auth_1.authorize)(['admin']), adminSurvey_controller_1.deleteSurvey);
router.route('/admin/:id/submissions').get(auth_1.authenticate, (0, auth_1.authorize)(['admin']), adminSurvey_controller_1.getSurveySubmissions);
router.route('/admin/:id/export').get(auth_1.authenticate, (0, auth_1.authorize)(['admin']), adminSurvey_controller_1.exportSubmissionsToExcel);
// --- USER ROUTES ---
router.route('/')
    .get(auth_1.authenticate, userSurvey_controller_1.getPublishedSurveys);
router.route('/:id')
    .get(auth_1.authenticate, userSurvey_controller_1.getSurveyToFill);
router.route('/:id/submit')
    .post(auth_1.authenticate, userSurvey_controller_1.submitSurvey);
exports.default = router;
//# sourceMappingURL=survey.js.map