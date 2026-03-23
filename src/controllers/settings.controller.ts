import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SystemSettings from '../models/system-settings';
import User from '../models/user';

// Keys
const POINT_PRICE_KEY = 'pointPrice'; // currency per 1 point
const USER_MENU_CONFIG_KEY = 'userMenuConfig';

type MenuItemConfig = {
  key: string;
  name: string;
  href: string;
  visible: boolean;
  openInNewTab: boolean;
  order: number;
};

type UserMenuConfig = {
  items: MenuItemConfig[];
};

const defaultMenuConfig: UserMenuConfig = {
  items: [
    { key: 'shop', name: 'Cửa hàng', href: '/shop', visible: true, openInNewTab: false, order: 1 },
    { key: 'news', name: 'Tin tức', href: '/news', visible: true, openInNewTab: false, order: 2 },
    { key: 'predictions', name: 'Dự đoán trúng thưởng', href: '/predictions', visible: true, openInNewTab: false, order: 3 },
    { key: 'voting', name: 'Bình chọn', href: '/voting', visible: true, openInNewTab: false, order: 4 },
    { key: 'surveys', name: 'Khảo sát', href: '/surveys', visible: true, openInNewTab: false, order: 5 },
    { key: 'feedback', name: 'Phản hồi', href: '/feedback', visible: true, openInNewTab: false, order: 6 },
    { key: 'dashboard', name: 'Bảng điều khiển', href: '/dashboard', visible: true, openInNewTab: false, order: 7 },
    { key: 'my-orders', name: 'Đơn hàng của tôi', href: '/shop/orders', visible: true, openInNewTab: false, order: 8 },
    { key: 'check-in', name: 'Điểm danh', href: '/check-in', visible: true, openInNewTab: false, order: 9 },
    { key: 'profile', name: 'Hồ sơ cá nhân', href: '/profile', visible: true, openInNewTab: false, order: 10 },
    { key: 'referrals', name: 'Giới thiệu', href: '/referrals', visible: true, openInNewTab: false, order: 11 }
  ]
};

const getNormalizedMenuConfig = (input: any): UserMenuConfig => {
  if (!input || typeof input !== 'object' || !Array.isArray(input.items)) {
    return defaultMenuConfig;
  }

  const normalizedItems = input.items
    .map((item: any, index: number) => ({
      key: String(item?.key || `custom-${index + 1}`).trim(),
      name: String(item?.name || '').trim(),
      href: String(item?.href || '').trim(),
      visible: item?.visible !== false,
      openInNewTab: Boolean(item?.openInNewTab),
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index + 1
    }))
    .filter((item: MenuItemConfig) => item.name && item.href);

  return {
    items: normalizedItems.length > 0 ? normalizedItems : defaultMenuConfig.items
  };
};

const getStoredGlobalMenuConfig = async (): Promise<UserMenuConfig> => {
  const setting = await SystemSettings.findOne({ settingKey: USER_MENU_CONFIG_KEY });
  return getNormalizedMenuConfig(setting?.settingValue);
};

export const getPointPricePublic = async (_req: any, res: Response) => {
  try {
    const setting = await SystemSettings.findOne({ settingKey: POINT_PRICE_KEY });
    const value = Number(setting?.settingValue) || 1; // default 1 currency per point if not set
    res.json({ success: true, data: { pointPrice: value } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPointPriceAdmin = async (_req: AuthRequest, res: Response) => {
  try {
    const setting = await SystemSettings.findOne({ settingKey: POINT_PRICE_KEY });
    const value = Number(setting?.settingValue) || 1;
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
  const currencyPerPoint = Number(setting?.settingValue) || 1; // default
  if (currencyPerPoint <= 0) return 0;
  return Math.floor(amount / currencyPerPoint);
};

export const getUserMenuConfig = async (req: AuthRequest, res: Response) => {
  try {
    const globalConfig = await getStoredGlobalMenuConfig();
    const authUserId = req.user?.id;

    if (!authUserId) {
      return res.json({
        success: true,
        data: {
          source: 'global',
          globalConfig,
          effectiveConfig: globalConfig
        }
      });
    }

    const user = await User.findById(authUserId).select('menuConfig');
    const userConfigEnabled = Boolean((user as any)?.menuConfig?.enabled);
    const userConfig = getNormalizedMenuConfig((user as any)?.menuConfig);

    res.json({
      success: true,
      data: {
        source: userConfigEnabled ? 'user' : 'global',
        globalConfig,
        userConfig: userConfigEnabled ? userConfig : null,
        effectiveConfig: userConfigEnabled ? userConfig : globalConfig
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getGlobalMenuConfigAdmin = async (_req: AuthRequest, res: Response) => {
  try {
    const config = await getStoredGlobalMenuConfig();
    res.json({ success: true, data: config });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateGlobalMenuConfigAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const config = getNormalizedMenuConfig((req.body as any) || {});
    if (!Array.isArray(config.items) || config.items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one menu item is required' });
    }

    await SystemSettings.findOneAndUpdate(
      { settingKey: USER_MENU_CONFIG_KEY },
      { settingKey: USER_MENU_CONFIG_KEY, settingValue: config, description: 'User menu configuration' },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: config, message: 'Global menu configuration updated successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getUserMenuConfigAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('name email menuConfig');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const globalConfig = await getStoredGlobalMenuConfig();
    const userConfigEnabled = Boolean((user as any)?.menuConfig?.enabled);
    const userConfig = getNormalizedMenuConfig((user as any)?.menuConfig);

    res.json({
      success: true,
      data: {
        user: {
          id: (user as any)._id.toString(),
          name: (user as any).name,
          email: (user as any).email
        },
        source: userConfigEnabled ? 'user' : 'global',
        globalConfig,
        userConfig: userConfigEnabled ? userConfig : null,
        effectiveConfig: userConfigEnabled ? userConfig : globalConfig
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateUserMenuConfigAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const enabled = Boolean((req.body as any)?.enabled);
    const config = getNormalizedMenuConfig((req.body as any)?.config || {});

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        menuConfig: {
          enabled,
          items: config.items
        }
      },
      { new: true }
    ).select('name email menuConfig');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: (updatedUser as any)._id.toString(),
          name: (updatedUser as any).name,
          email: (updatedUser as any).email
        },
        source: enabled ? 'user' : 'global',
        userConfig: enabled ? { items: (updatedUser as any).menuConfig.items || [] } : null
      },
      message: 'User menu configuration updated successfully'
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

