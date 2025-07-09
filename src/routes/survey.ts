import express from 'express';
const router = express.Router();

import {
    createSurvey,
    getSurveys,
    getSurveyById,
    updateSurvey,
    deleteSurvey,
    getSurveySubmissions,
    exportSubmissionsToExcel
} from '../controllers/adminSurvey.controller';

import {
    getPublishedSurveys,
    getSurveyToFill,
    submitSurvey
} from '../controllers/userSurvey.controller';

import { authMiddleware as protect, adminMiddleware as admin } from '../middleware/auth';

// --- ADMIN ROUTES ---
router.route('/admin')
    .post(protect, admin, createSurvey)
    .get(protect, admin, getSurveys);

router.route('/admin/:id')
    .get(protect, admin, getSurveyById)
    .put(protect, admin, updateSurvey)
    .delete(protect, admin, deleteSurvey);

router.route('/admin/:id/submissions').get(protect, admin, getSurveySubmissions);
router.route('/admin/:id/export').get(protect, admin, exportSubmissionsToExcel);


// --- USER ROUTES ---
router.route('/')
    .get(protect, getPublishedSurveys);

router.route('/:id')
    .get(protect, getSurveyToFill);

router.route('/:id/submit')
    .post(protect, submitSurvey);

export default router; 