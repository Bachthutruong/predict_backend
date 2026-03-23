import express from 'express';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';
import {
  getPointPricePublic,
  getPointPriceAdmin,
  updatePointPriceAdmin,
  getUserMenuConfig,
  getGlobalMenuConfigAdmin,
  updateGlobalMenuConfigAdmin,
  getUserMenuConfigAdmin,
  updateUserMenuConfigAdmin
} from '../controllers/settings.controller';

const router = express.Router();

// Public endpoint to get point price
router.get('/point-price', getPointPricePublic);
router.get('/menu-config', optionalAuthenticate, getUserMenuConfig);

// Admin endpoints
router.get('/admin/point-price', authenticate, authorize(['admin']), getPointPriceAdmin);
router.put('/admin/point-price', authenticate, authorize(['admin']), updatePointPriceAdmin);
router.get('/admin/menu-config/global', authenticate, authorize(['admin']), getGlobalMenuConfigAdmin);
router.put('/admin/menu-config/global', authenticate, authorize(['admin']), updateGlobalMenuConfigAdmin);
router.get('/admin/menu-config/user/:userId', authenticate, authorize(['admin']), getUserMenuConfigAdmin);
router.put('/admin/menu-config/user/:userId', authenticate, authorize(['admin']), updateUserMenuConfigAdmin);

export default router;


