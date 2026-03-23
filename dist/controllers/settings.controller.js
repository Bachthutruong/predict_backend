"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserMenuConfigAdmin = exports.getUserMenuConfigAdmin = exports.updateGlobalMenuConfigAdmin = exports.getGlobalMenuConfigAdmin = exports.getUserMenuConfig = exports.computePointsFromAmount = exports.updatePointPriceAdmin = exports.getPointPriceAdmin = exports.getPointPricePublic = void 0;
const system_settings_1 = __importDefault(require("../models/system-settings"));
const user_1 = __importDefault(require("../models/user"));
// Keys
const POINT_PRICE_KEY = 'pointPrice'; // currency per 1 point
const USER_MENU_CONFIG_KEY = 'userMenuConfig';
const defaultMenuConfig = {
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
const getNormalizedMenuConfig = (input) => {
    if (!input || typeof input !== 'object' || !Array.isArray(input.items)) {
        return defaultMenuConfig;
    }
    const normalizedItems = input.items
        .map((item, index) => ({
        key: String(item?.key || `custom-${index + 1}`).trim(),
        name: String(item?.name || '').trim(),
        href: String(item?.href || '').trim(),
        visible: item?.visible !== false,
        openInNewTab: Boolean(item?.openInNewTab),
        order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index + 1
    }))
        .filter((item) => item.name && item.href);
    return {
        items: normalizedItems.length > 0 ? normalizedItems : defaultMenuConfig.items
    };
};
const getStoredGlobalMenuConfig = async () => {
    const setting = await system_settings_1.default.findOne({ settingKey: USER_MENU_CONFIG_KEY });
    return getNormalizedMenuConfig(setting?.settingValue);
};
const getPointPricePublic = async (_req, res) => {
    try {
        const setting = await system_settings_1.default.findOne({ settingKey: POINT_PRICE_KEY });
        const value = Number(setting?.settingValue) || 1; // default 1 currency per point if not set
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
        const value = Number(setting?.settingValue) || 1;
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
    const currencyPerPoint = Number(setting?.settingValue) || 1; // default
    if (currencyPerPoint <= 0)
        return 0;
    return Math.floor(amount / currencyPerPoint);
};
exports.computePointsFromAmount = computePointsFromAmount;
const getUserMenuConfig = async (req, res) => {
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
        const user = await user_1.default.findById(authUserId).select('menuConfig');
        const userConfigEnabled = Boolean(user?.menuConfig?.enabled);
        const userConfig = getNormalizedMenuConfig(user?.menuConfig);
        res.json({
            success: true,
            data: {
                source: userConfigEnabled ? 'user' : 'global',
                globalConfig,
                userConfig: userConfigEnabled ? userConfig : null,
                effectiveConfig: userConfigEnabled ? userConfig : globalConfig
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getUserMenuConfig = getUserMenuConfig;
const getGlobalMenuConfigAdmin = async (_req, res) => {
    try {
        const config = await getStoredGlobalMenuConfig();
        res.json({ success: true, data: config });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getGlobalMenuConfigAdmin = getGlobalMenuConfigAdmin;
const updateGlobalMenuConfigAdmin = async (req, res) => {
    try {
        const config = getNormalizedMenuConfig(req.body || {});
        if (!Array.isArray(config.items) || config.items.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one menu item is required' });
        }
        await system_settings_1.default.findOneAndUpdate({ settingKey: USER_MENU_CONFIG_KEY }, { settingKey: USER_MENU_CONFIG_KEY, settingValue: config, description: 'User menu configuration' }, { upsert: true, new: true });
        res.json({ success: true, data: config, message: 'Global menu configuration updated successfully' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateGlobalMenuConfigAdmin = updateGlobalMenuConfigAdmin;
const getUserMenuConfigAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await user_1.default.findById(userId).select('name email menuConfig');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const globalConfig = await getStoredGlobalMenuConfig();
        const userConfigEnabled = Boolean(user?.menuConfig?.enabled);
        const userConfig = getNormalizedMenuConfig(user?.menuConfig);
        res.json({
            success: true,
            data: {
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email
                },
                source: userConfigEnabled ? 'user' : 'global',
                globalConfig,
                userConfig: userConfigEnabled ? userConfig : null,
                effectiveConfig: userConfigEnabled ? userConfig : globalConfig
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getUserMenuConfigAdmin = getUserMenuConfigAdmin;
const updateUserMenuConfigAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const enabled = Boolean(req.body?.enabled);
        const config = getNormalizedMenuConfig(req.body?.config || {});
        const updatedUser = await user_1.default.findByIdAndUpdate(userId, {
            menuConfig: {
                enabled,
                items: config.items
            }
        }, { new: true }).select('name email menuConfig');
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({
            success: true,
            data: {
                user: {
                    id: updatedUser._id.toString(),
                    name: updatedUser.name,
                    email: updatedUser.email
                },
                source: enabled ? 'user' : 'global',
                userConfig: enabled ? { items: updatedUser.menuConfig.items || [] } : null
            },
            message: 'User menu configuration updated successfully'
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateUserMenuConfigAdmin = updateUserMenuConfigAdmin;
//# sourceMappingURL=settings.controller.js.map