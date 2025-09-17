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

import { authenticate, authorize } from '../middleware/auth';

// --- PUBLIC ROUTES (no auth required) ---
router.route('/public')
    .get(getPublishedSurveys);

router.route('/public/:id')
    .get(getSurveyToFill);

// --- ADMIN ROUTES ---
router.route('/admin')
    .post(authenticate, authorize(['admin']), createSurvey)
    .get(authenticate, authorize(['admin']), getSurveys);

router.route('/admin/:id')
    .get(authenticate, authorize(['admin']), getSurveyById)
    .put(authenticate, authorize(['admin']), updateSurvey)
    .delete(authenticate, authorize(['admin']), deleteSurvey);

router.route('/admin/:id/submissions').get(authenticate, authorize(['admin']), getSurveySubmissions);
router.route('/admin/:id/export').get(authenticate, authorize(['admin']), exportSubmissionsToExcel);


// --- USER ROUTES ---
router.route('/')
    .get(authenticate, getPublishedSurveys);

router.route('/:id')
    .get(authenticate, getSurveyToFill);

router.route('/:id/submit')
    .post(authenticate, submitSurvey);

export default router; 