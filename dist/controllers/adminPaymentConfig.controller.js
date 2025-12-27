"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentConfig = exports.getPaymentConfig = void 0;
const PaymentConfig_1 = __importDefault(require("../models/PaymentConfig"));
const getPaymentConfig = async (req, res) => {
    try {
        let config = await PaymentConfig_1.default.findOne({ type: 'bank_transfer' });
        if (!config) {
            config = await PaymentConfig_1.default.create({ type: 'bank_transfer' });
        }
        res.json({ success: true, data: config });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getPaymentConfig = getPaymentConfig;
const updatePaymentConfig = async (req, res) => {
    try {
        // Only allow bank_transfer updates for now
        req.body.type = 'bank_transfer';
        const config = await PaymentConfig_1.default.findOneAndUpdate({ type: 'bank_transfer' }, req.body, { new: true, upsert: true });
        res.json({ success: true, data: config });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updatePaymentConfig = updatePaymentConfig;
//# sourceMappingURL=adminPaymentConfig.controller.js.map