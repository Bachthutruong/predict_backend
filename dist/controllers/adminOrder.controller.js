"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = exports.getOrderStatistics = exports.addTrackingNumber = exports.updatePaymentStatus = exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = void 0;
const order_1 = __importDefault(require("../models/order"));
const user_1 = __importDefault(require("../models/user"));
const point_transaction_1 = __importDefault(require("../models/point-transaction"));
// Get all orders with pagination and filters
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = '', paymentStatus = '', search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};
        if (status) {
            query.status = status;
        }
        if (paymentStatus) {
            query.paymentStatus = paymentStatus;
        }
        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingAddress.name': { $regex: search, $options: 'i' } },
                { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
            ];
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const orders = await order_1.default.find(query)
            .populate('user', 'name email phone')
            .populate('items.product', 'name images price')
            .populate('coupon', 'code name discountType discountValue')
            .sort(sortOptions)
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await order_1.default.countDocuments(query);
        res.json({
            success: true,
            data: orders,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAllOrders = getAllOrders;
// Get single order
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await order_1.default.findById(id)
            .populate('user', 'name email phone address')
            .populate('items.product', 'name images price pointsReward')
            .populate('coupon', 'code name discountType discountValue')
            .populate('cancelledBy', 'name email');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, data: order });
    }
    catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getOrderById = getOrderById;
// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        const validStatuses = [
            'pending', 'waiting_payment', 'waiting_confirmation',
            'processing', 'shipped', 'delivered', 'completed', 'cancelled'
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        const order = await order_1.default.findById(id).populate('user', 'points');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // Validate: Payment status must be 'paid' before allowing certain status changes
        const statusesRequiringPayment = ['processing', 'shipped', 'delivered', 'completed'];
        if (statusesRequiringPayment.includes(status) && order.paymentStatus !== 'paid') {
            return res.status(400).json({
                success: false,
                message: `Cannot change order status to '${status}' because payment status is '${order.paymentStatus}'. Please update payment status to 'paid' first.`
            });
        }
        const oldStatus = order.status;
        order.status = status;
        if (adminNotes) {
            order.adminNotes = adminNotes;
        }
        // Handle status-specific logic
        if (status === 'shipped') {
            order.shippedAt = new Date();
        }
        else if (status === 'delivered') {
            order.deliveredAt = new Date();
        }
        else if (status === 'completed') {
            // Add points to user when order is completed (only if not already completed)
            if (oldStatus !== 'completed') {
                const userId = order.user?._id || order.user?.id || order.user;
                let pointsToAdd = Number(order.pointsEarned || 0);
                // Fallback: If pointsEarned is 0 or invalid, try to recalculate from items
                if ((!Number.isFinite(pointsToAdd) || pointsToAdd <= 0) && order.items && order.items.length > 0) {
                    console.log(`[Order] pointsEarned is ${pointsToAdd}, recalculating from items for order ${order._id}`);
                    pointsToAdd = 0;
                    // Calculate from items (each item has pointsEarned field)
                    for (const item of order.items) {
                        const itemPoints = Number(item.pointsEarned || 0);
                        pointsToAdd += itemPoints;
                    }
                    // Update the order with recalculated points
                    if (pointsToAdd > 0) {
                        order.pointsEarned = pointsToAdd;
                        console.log(`[Order] Recalculated pointsEarned=${pointsToAdd} for order ${order._id}`);
                    }
                }
                console.log(`[Order] Completing order=${order._id} user=${userId} paymentStatus=${order.paymentStatus} status=${order.status} pointsEarned=${pointsToAdd}`);
                if (userId && Number.isFinite(pointsToAdd) && pointsToAdd > 0) {
                    const user = await user_1.default.findById(userId);
                    if (user) {
                        // Check if points were already awarded by checking PointTransaction
                        const existingTransaction = await point_transaction_1.default.findOne({
                            userId: user._id,
                            reason: 'order-completion',
                            notes: { $regex: order.orderNumber }
                        });
                        if (!existingTransaction) {
                            user.points = Math.max(0, Number(user.points || 0)) + pointsToAdd;
                            await user.save();
                            console.log(`[Order] Credited ${pointsToAdd} points to user ${user._id}. New balance=${user.points}`);
                            // Create point transaction record
                            try {
                                await point_transaction_1.default.create({
                                    userId: user._id,
                                    amount: pointsToAdd,
                                    reason: 'order-completion',
                                    notes: `Order ${order.orderNumber}`,
                                });
                            }
                            catch (txErr) {
                                console.warn('[Order] Failed to log point transaction', txErr);
                            }
                        }
                        else {
                            console.log(`[Order] Points already awarded for order ${order.orderNumber}`);
                        }
                    }
                    else {
                        console.warn(`[Order] User ${userId} not found when crediting points for order ${order._id}`);
                    }
                }
                else {
                    console.warn(`[Order] Invalid pointsEarned (${pointsToAdd}) or userId for order ${order._id}. Items: ${order.items?.length || 0}`);
                }
            }
        }
        else if (status === 'cancelled') {
            order.cancelledAt = new Date();
            order.cancelledBy = req.user?.id;
            // Refund points used (add back to user) if not already refunded
            if (!order.pointsRefunded && order.pointsUsed > 0) {
                const userId = order.user?._id || order.user?.id || order.user;
                if (userId) {
                    const user = await user_1.default.findById(userId);
                    if (user) {
                        user.points = Math.max(0, Number(user.points || 0)) + Number(order.pointsUsed || 0);
                        await user.save();
                        order.pointsRefunded = true;
                    }
                }
            }
            // If order was previously completed, revoke awarded points
            if (oldStatus === 'completed' && order.pointsEarned > 0) {
                const userId = order.user?._id || order.user?.id || order.user;
                if (userId) {
                    const user = await user_1.default.findById(userId);
                    if (user) {
                        user.points = Math.max(0, Number(user.points || 0) - Number(order.pointsEarned || 0));
                        await user.save();
                        console.log(`[Order] Revoked ${order.pointsEarned} points from user ${user._id} due to cancellation`);
                    }
                }
            }
        }
        await order.save();
        res.json({
            success: true,
            data: order,
            message: `Order status updated from ${oldStatus} to ${status}`
        });
    }
    catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
// Update payment status
const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus } = req.body;
        const validStatuses = ['pending', 'waiting_confirmation', 'paid', 'failed', 'refunded'];
        if (!validStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment status'
            });
        }
        const order = await order_1.default.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        order.paymentStatus = paymentStatus;
        // Update order status based on payment status
        if (paymentStatus === 'paid') {
            if (order.status === 'waiting_payment') {
                order.status = 'processing';
            }
        }
        await order.save();
        res.json({
            success: true,
            data: order,
            message: 'Payment status updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updatePaymentStatus = updatePaymentStatus;
// Add tracking number
const addTrackingNumber = async (req, res) => {
    try {
        const { id } = req.params;
        const { trackingNumber } = req.body;
        const order = await order_1.default.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        order.trackingNumber = trackingNumber;
        order.status = 'shipped';
        order.shippedAt = new Date();
        await order.save();
        res.json({
            success: true,
            data: order,
            message: 'Tracking number added successfully'
        });
    }
    catch (error) {
        console.error('Error adding tracking number:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.addTrackingNumber = addTrackingNumber;
// Get order statistics
const getOrderStatistics = async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        const days = Number(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const stats = await order_1.default.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    averageOrderValue: { $avg: '$totalAmount' },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                    }
                }
            }
        ]);
        const statusBreakdown = await order_1.default.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        const paymentStatusBreakdown = await order_1.default.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$paymentStatus',
                    count: { $sum: 1 }
                }
            }
        ]);
        res.json({
            success: true,
            data: {
                overview: stats[0] || {
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
    catch (error) {
        console.error('Error getting order statistics:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getOrderStatistics = getOrderStatistics;
// Cancel order
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const order = await order_1.default.findById(id).populate('user', 'points');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // Check if order can be cancelled
        const cancellableStatuses = ['pending', 'waiting_payment', 'waiting_confirmation'];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled at this stage'
            });
        }
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancelledBy = req.user?.id;
        order.cancellationReason = reason || 'Cancelled by admin';
        // Refund points if any were used
        if (order.pointsUsed > 0 && order.user && typeof order.user.points === 'number') {
            const user = await user_1.default.findById(order.user._id);
            if (user) {
                user.points = Math.max(0, user.points - order.pointsUsed);
                await user.save();
                order.pointsRefunded = true;
            }
        }
        await order.save();
        res.json({
            success: true,
            data: order,
            message: 'Order cancelled successfully'
        });
    }
    catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.cancelOrder = cancelOrder;
//# sourceMappingURL=adminOrder.controller.js.map