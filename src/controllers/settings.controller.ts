import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SystemSettings from '../models/system-settings';

// Keys
const POINT_PRICE_KEY = 'pointPrice'; // currency per 1 point

export const getPointPricePublic = async (_req: any, res: Response) => {
  try {
    const setting = await SystemSettings.findOne({ settingKey: POINT_PRICE_KEY });
    const value = setting?.settingValue ?? 1; // default 1 currency per point if not set
    res.json({ success: true, data: { pointPrice: value } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPointPriceAdmin = async (_req: AuthRequest, res: Response) => {
  try {
    const setting = await SystemSettings.findOne({ settingKey: POINT_PRICE_KEY });
    const value = setting?.settingValue ?? 1;
    res.json({ success: true, data: { pointPrice: value } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updatePointPriceAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const raw = (req.body as any)?.pointPrice;
    const pointPrice = Number(raw);
    if (!raw && raw !== 0) {
      return res.status(400).json({ success: false, message: 'pointPrice is required' });
    }
    if (!Number.isFinite(pointPrice) || pointPrice <= 0) {
      return res.status(400).json({ success: false, message: 'pointPrice must be a positive number' });
    }
    const updated = await SystemSettings.findOneAndUpdate(
      { settingKey: POINT_PRICE_KEY },
      { settingKey: POINT_PRICE_KEY, settingValue: pointPrice, description: 'Currency per 1 point' },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: { pointPrice: updated.settingValue } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const computePointsFromAmount = async (amount: number): Promise<number> => {
  const setting = await SystemSettings.findOne({ settingKey: POINT_PRICE_KEY });
  const currencyPerPoint = setting?.settingValue ?? 1; // default
  if (currencyPerPoint <= 0) return 0;
  return Math.floor(amount / currencyPerPoint);
};


