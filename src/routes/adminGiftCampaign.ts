import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  createGiftCampaign,
  deleteGiftCampaign,
  getGiftCampaignById,
  getGiftCampaigns,
  updateGiftCampaign
} from '../controllers/adminGiftCampaign.controller';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin']));

router.get('/', getGiftCampaigns);
router.get('/:id', getGiftCampaignById);
router.post('/', createGiftCampaign);
router.put('/:id', updateGiftCampaign);
router.delete('/:id', deleteGiftCampaign);

export default router;
