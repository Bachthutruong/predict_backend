import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import GiftCampaign from '../models/GiftCampaign';

export const getGiftCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await GiftCampaign.find()
      .populate('triggerProducts', 'name images')
      .populate('giftProducts', 'name images price isActive stock')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Error getting gift campaigns:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getGiftCampaignById = async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await GiftCampaign.findById(req.params.id)
      .populate('triggerProducts', 'name images')
      .populate('giftProducts', 'name images price isActive stock');
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Gift campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error getting gift campaign:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createGiftCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description = '',
      requiredQuantity,
      triggerProducts = [],
      giftProducts = [],
      allowMultiSelect = false,
      maxSelectableGifts = 1,
      isActive = true
    } = req.body;

    if (!name || !requiredQuantity || !Array.isArray(giftProducts) || giftProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, required quantity and at least one gift product are required'
      });
    }

    const campaign = new GiftCampaign({
      name,
      description,
      requiredQuantity: Number(requiredQuantity),
      triggerProducts,
      giftProducts,
      allowMultiSelect: Boolean(allowMultiSelect),
      maxSelectableGifts: Number(maxSelectableGifts) || 1,
      isActive: Boolean(isActive),
      createdBy: req.user?.id
    });

    await campaign.save();
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error creating gift campaign:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateGiftCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const allowedFields = [
      'name',
      'description',
      'requiredQuantity',
      'triggerProducts',
      'giftProducts',
      'allowMultiSelect',
      'maxSelectableGifts',
      'isActive'
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updateData[key] = (req.body as Record<string, unknown>)[key];
      }
    }
    const campaign = await GiftCampaign.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Gift campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Error updating gift campaign:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteGiftCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await GiftCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Gift campaign not found' });
    }
    res.json({ success: true, message: 'Gift campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting gift campaign:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
