import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listSystemOrders, getSystemOrderById, createSystemOrder, updateSystemOrder, deleteSystemOrder, updateSystemOrderStatus, updateSystemPaymentStatus, getSystemOrderStatistics } from '../controllers/adminSystemOrder.controller';

const router = express.Router();
router.use(authenticate);
router.use(authorize(['admin']));

router.get('/', listSystemOrders);
// Place statistics before dynamic :id to avoid shadowing
router.get('/statistics', getSystemOrderStatistics);
router.get('/:id', getSystemOrderById);
router.post('/', createSystemOrder);
router.put('/:id', updateSystemOrder);
router.delete('/:id', deleteSystemOrder);
router.patch('/:id/status', updateSystemOrderStatus);
router.patch('/:id/payment-status', updateSystemPaymentStatus);

export default router;


