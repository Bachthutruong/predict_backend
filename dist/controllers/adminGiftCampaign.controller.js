"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGiftCampaign = exports.updateGiftCampaign = exports.createGiftCampaign = exports.getGiftCampaignById = exports.getGiftCampaigns = void 0;
const GiftCampaign_1 = __importDefault(require("../models/GiftCampaign"));
const getGiftCampaigns = async (req, res) => {
    try {
        const campaigns = await GiftCampaign_1.default.find()
            .populate('triggerProducts', 'name images')
            .populate('giftProducts', 'name images price isActive stock')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: campaigns });
    }
    catch (error) {
        console.error('Error getting gift campaigns:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getGiftCampaigns = getGiftCampaigns;
const getGiftCampaignById = async (req, res) => {
    try {
        const campaign = await GiftCampaign_1.default.findById(req.params.id)
            .populate('triggerProducts', 'name images')
            .populate('giftProducts', 'name images price isActive stock');
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Gift campaign not found' });
        }
        res.json({ success: true, data: campaign });
    }
    catch (error) {
        console.error('Error getting gift campaign:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getGiftCampaignById = getGiftCampaignById;
const createGiftCampaign = async (req, res) => {
    try {
        const { name, description = '', requiredQuantity, triggerProducts = [], giftProducts = [], allowMultiSelect = false, maxSelectableGifts = 1, isActive = true } = req.body;
        if (!name || !requiredQuantity || !Array.isArray(giftProducts) || giftProducts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Name, required quantity and at least one gift product are required'
            });
        }
        const campaign = new GiftCampaign_1.default({
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
    }
    catch (error) {
        console.error('Error creating gift campaign:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createGiftCampaign = createGiftCampaign;
const updateGiftCampaign = async (req, res) => {
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
        const updateData = {};
        for (const key of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updateData[key] = req.body[key];
            }
        }
        const campaign = await GiftCampaign_1.default.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Gift campaign not found' });
        }
        res.json({ success: true, data: campaign });
    }
    catch (error) {
        console.error('Error updating gift campaign:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateGiftCampaign = updateGiftCampaign;
const deleteGiftCampaign = async (req, res) => {
    try {
        const campaign = await GiftCampaign_1.default.findByIdAndDelete(req.params.id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: 'Gift campaign not found' });
        }
        res.json({ success: true, message: 'Gift campaign deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting gift campaign:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.deleteGiftCampaign = deleteGiftCampaign;
//# sourceMappingURL=adminGiftCampaign.controller.js.map