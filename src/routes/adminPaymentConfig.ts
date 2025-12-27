import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getPaymentConfig, updatePaymentConfig } from '../controllers/adminPaymentConfig.controller';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.get('/', getPaymentConfig);
router.put('/', updatePaymentConfig);

export default router;
