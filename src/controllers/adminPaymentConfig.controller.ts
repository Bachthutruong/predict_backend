import { Response } from 'express';
import PaymentConfig from '../models/PaymentConfig';
import { AuthRequest } from '../middleware/auth';

export const getPaymentConfig = async (req: AuthRequest, res: Response) => {
    try {
        let config = await PaymentConfig.findOne({ type: 'bank_transfer' });
        if (!config) {
            config = await PaymentConfig.create({ type: 'bank_transfer' });
        }
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updatePaymentConfig = async (req: AuthRequest, res: Response) => {
    try {
        // Only allow bank_transfer updates for now
        req.body.type = 'bank_transfer';
        const config = await PaymentConfig.findOneAndUpdate(
            { type: 'bank_transfer' },
            req.body,
            { new: true, upsert: true }
        );
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
