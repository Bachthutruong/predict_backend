"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemOrderStatistics = exports.updateSystemPaymentStatus = exports.updateSystemOrderStatus = exports.deleteSystemOrder = exports.updateSystemOrder = exports.createSystemOrder = exports.getSystemOrderById = exports.listSystemOrders = void 0;
const SystemOrder_1 = __importDefault(require("../models/SystemOrder"));
const Coupon_1 = __importDefault(require("../models/Coupon"));
const user_1 = __importDefault(require("../models/user"));
const point_transaction_1 = __importDefault(require("../models/point-transaction"));
const listSystemOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = '', paymentStatus = '', search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};
        if (status)
            query.status = status;
        if (paymentStatus)
            query.paymentStatus = paymentStatus;
        if (search) {
            query.$or = [
                { orderNumber: { $regex: String(search), $options: 'i' } },
                { 'shippingAddress.name': { $regex: String(search), $options: 'i' } },
                { 'shippingAddress.phone': { $regex: String(search), $options: 'i' } }
            ];
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const docs = await SystemOrder_1.default.find(query)
            .populate('user', 'name email phone')
            .populate('items.product', 'name images price')
            .sort(sortOptions).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
        const total = await SystemOrder_1.default.countDocuments(query);
        res.json({ success: true, data: docs, pagination: { current: Number(page), pages: Math.ceil(total / Number(limit)), total } });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.listSystemOrders = listSystemOrders;
const getSystemOrderById = async (req, res) => {
    try {
        const order = await SystemOrder_1.default.findById(req.params.id)
            .populate('user', 'name email phone address')
            .populate('items.product', 'name images price');
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found' });
        res.json({ success: true, data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getSystemOrderById = getSystemOrderById;
const createSystemOrder = async (req, res) => {
    try {
        const order = new SystemOrder_1.default({ ...req.body });
        await order.save();
        // If a coupon was used, increment usage stats
        if (order.couponCode) {
            await Coupon_1.default.findOneAndUpdate({ code: order.couponCode }, {
                $inc: {
                    usedCount: 1,
                    totalOrdersAffected: 1,
                    totalDiscountGiven: Math.max(0, Number(order.discountAmount || 0))
                }
            });
        }
        res.status(201).json({ success: true, data: order });
    }
    catch (e) {
        // Surface validation errors to the client for easier debugging
        console.error('createSystemOrder error:', e);
        if (e?.name === 'ValidationError') {
            const details = {};
            Object.values(e.errors || {}).forEach((err) => {
                if (err?.path)
                    details[err.path] = err.message;
            });
            return res.status(400).json({ success: false, message: 'Validation failed', details });
        }
        res.status(500).json({ success: false, message: e?.message || 'Internal server error' });
    }
};
exports.createSystemOrder = createSystemOrder;
const updateSystemOrder = async (req, res) => {
    try {
        const existing = await SystemOrder_1.default.findById(req.params.id);
        const order = await SystemOrder_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('user', 'name email phone');
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found' });
        // Adjust coupon usage if couponCode changed
        try {
            const oldCode = existing?.couponCode;
            const newCode = req.body?.couponCode;
            if (oldCode && oldCode !== newCode) {
                await Coupon_1.default.findOneAndUpdate({ code: oldCode }, {
                    $inc: {
                        usedCount: -1,
                        totalOrdersAffected: -1,
                        totalDiscountGiven: -Math.max(0, Number(existing?.discountAmount || 0))
                    }
                });
            }
            if (newCode && oldCode !== newCode) {
                await Coupon_1.default.findOneAndUpdate({ code: newCode }, {
                    $inc: {
                        usedCount: 1,
                        totalOrdersAffected: 1,
                        totalDiscountGiven: Math.max(0, Number(order.discountAmount || req.body?.discountAmount || 0))
                    }
                });
            }
        }
        catch { }
        res.json({ success: true, data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateSystemOrder = updateSystemOrder;
const deleteSystemOrder = async (req, res) => {
    try {
        const order = await SystemOrder_1.default.findByIdAndDelete(req.params.id);
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found' });
        if (order.couponCode) {
            await Coupon_1.default.findOneAndUpdate({ code: order.couponCode }, {
                $inc: {
                    usedCount: -1,
                    totalOrdersAffected: -1,
                    totalDiscountGiven: -Math.max(0, Number(order.discountAmount || 0))
                }
            });
        }
        res.json({ success: true, message: 'Order deleted' });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.deleteSystemOrder = deleteSystemOrder;
const updateSystemOrderStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const order = await SystemOrder_1.default.findById(req.params.id).populate('user', 'points');
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found' });
        const oldStatus = order.status;
        order.status = status || order.status;
        if (adminNotes)
            order.adminNotes = adminNotes;
        if (status === 'shipped')
            order.shippedAt = new Date();
        if (status === 'delivered')
            order.deliveredAt = new Date();
        if (status === 'completed') {
            // Award points to user when completed
            try {
                const userId = order.user?._id || order.user || undefined;
                const pointsToAdd = Number(order.pointsEarned || 0);
                console.log(`[SystemOrder] Completing order=${order._id} user=${userId} paymentStatus=${order.paymentStatus} status=${order.status} pointsEarned=${pointsToAdd}`);
                if (!userId) {
                    console.warn('[SystemOrder] No user id on order, cannot credit points');
                }
                else if (!Number.isFinite(pointsToAdd) || pointsToAdd <= 0) {
                    console.warn(`[SystemOrder] pointsEarned invalid (${order.pointsEarned}) for order ${order._id}`);
                }
                else {
                    const user = await user_1.default.findById(userId);
                    if (!user) {
                        console.warn(`[SystemOrder] User ${userId} not found when crediting points for order ${order._id}`);
                    }
                    else {
                        user.points = Math.max(0, Number(user.points || 0)) + pointsToAdd;
                        await user.save();
                        console.log(`[SystemOrder] Credited ${pointsToAdd} points to user ${user._id}. New balance=${user.points}`);
                        try {
                            await point_transaction_1.default.create({
                                userId: user._id,
                                amount: pointsToAdd,
                                reason: 'order-completion',
                                notes: `Order ${order.orderNumber} (${order.orderType || 'shop'})`,
                            });
                        }
                        catch (txErr) {
                            console.warn('[SystemOrder] Failed to log point transaction', txErr);
                        }
                    }
                }
            }
            catch (error) {
                console.error('[SystemOrder] Error crediting points:', error);
            }
        }
        if (status === 'cancelled') {
            // If order was previously completed, revoke awarded points
            try {
                if (oldStatus === 'completed') {
                    const user = await user_1.default.findById(order.user);
                    if (user) {
                        user.points = Math.max(0, user.points - Number(order.pointsEarned || 0));
                        await user.save();
                    }
                }
            }
            catch { }
        }
        await order.save();
        res.json({ success: true, data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateSystemOrderStatus = updateSystemOrderStatus;
const updateSystemPaymentStatus = async (req, res) => {
    try {
        const { paymentStatus } = req.body;
        const order = await SystemOrder_1.default.findById(req.params.id);
        if (!order)
            return res.status(404).json({ success: false, message: 'Order not found' });
        order.paymentStatus = paymentStatus || order.paymentStatus;
        if (paymentStatus === 'paid' && order.status === 'waiting_payment')
            order.status = 'processing';
        await order.save();
        res.json({ success: true, data: order });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateSystemPaymentStatus = updateSystemPaymentStatus;
const getSystemOrderStatistics = async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const days = Number(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const overviewAgg = await SystemOrder_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    averageOrderValue: { $avg: '$totalAmount' },
                    pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
                }
            }
        ]);
        const statusBreakdown = await SystemOrder_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const paymentStatusBreakdown = await SystemOrder_1.default.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
        ]);
        res.json({
            success: true,
            data: {
                overview: overviewAgg[0] || {
                    totalOrders: 0,
                    totalRevenue: 0,
                    averageOrderValue: 0,
                    pendingOrders: 0,
                    completedOrders: 0,
                    cancelledOrders: 0
                },
                statusBreakdown,
                paymentStatusBreakdown
            }
        });
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getSystemOrderStatistics = getSystemOrderStatistics;
//# sourceMappingURL=adminSystemOrder.controller.js.map