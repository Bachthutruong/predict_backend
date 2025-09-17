"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePointsFromAmount = exports.updatePointPriceAdmin = exports.getPointPriceAdmin = exports.getPointPricePublic = void 0;
const system_settings_1 = __importDefault(require("../models/system-settings"));
// Keys
const POINT_PRICE_KEY = 'pointPrice'; // currency per 1 point
const getPointPricePublic = async (_req, res) => {
    try {
        const setting = await system_settings_1.default.findOne({ settingKey: POINT_PRICE_KEY });
        const value = setting?.settingValue ?? 1; // default 1 currency per point if not set
        res.json({ success: true, data: { pointPrice: value } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getPointPricePublic = getPointPricePublic;
const getPointPriceAdmin = async (_req, res) => {
    try {
        const setting = await system_settings_1.default.findOne({ settingKey: POINT_PRICE_KEY });
        const value = setting?.settingValue ?? 1;
        res.json({ success: true, data: { pointPrice: value } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getPointPriceAdmin = getPointPriceAdmin;
const updatePointPriceAdmin = async (req, res) => {
    try {
        const raw = req.body?.pointPrice;
        const pointPrice = Number(raw);
        if (!raw && raw !== 0) {
            return res.status(400).json({ success: false, message: 'pointPrice is required' });
        }
        if (!Number.isFinite(pointPrice) || pointPrice <= 0) {
            return res.status(400).json({ success: false, message: 'pointPrice must be a positive number' });
        }
        const updated = await system_settings_1.default.findOneAndUpdate({ settingKey: POINT_PRICE_KEY }, { settingKey: POINT_PRICE_KEY, settingValue: pointPrice, description: 'Currency per 1 point' }, { upsert: true, new: true });
        res.json({ success: true, data: { pointPrice: updated.settingValue } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updatePointPriceAdmin = updatePointPriceAdmin;
const computePointsFromAmount = async (amount) => {
    const setting = await system_settings_1.default.findOne({ settingKey: POINT_PRICE_KEY });
    const currencyPerPoint = setting?.settingValue ?? 1; // default
    if (currencyPerPoint <= 0)
        return 0;
    return Math.floor(amount / currencyPerPoint);
};
exports.computePointsFromAmount = computePointsFromAmount;
//# sourceMappingURL=settings.controller.js.map