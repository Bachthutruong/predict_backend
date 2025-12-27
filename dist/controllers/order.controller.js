"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchasePoints = exports.getUserSuggestionPackages = exports.purchaseSuggestionPackage = exports.cancelOrder = exports.markDelivered = exports.confirmDelivery = exports.submitPaymentConfirmation = exports.createOrder = exports.getOrderById = exports.getUserOrders = void 0;
const SystemOrder_1 = __importDefault(require("../models/SystemOrder"));
const Cart_1 = __importDefault(require("../models/Cart"));
const user_1 = __importDefault(require("../models/user"));
const Product_1 = __importDefault(require("../models/Product"));
const Coupon_1 = __importDefault(require("../models/Coupon"));
const UserSuggestion_1 = __importDefault(require("../models/UserSuggestion"));
const SuggestionPackage_1 = __importDefault(require("../models/SuggestionPackage"));
const point_transaction_1 = __importDefault(require("../models/point-transaction"));
// Get user's orders
const getUserOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status = '', orderType = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = { user: req.user?.id };
        if (status) {
            query.status = status;
        }
        if (orderType) {
            query.orderType = orderType;
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const orders = await SystemOrder_1.default.find(query)
            .populate('items.product', 'name images price')
            .populate('coupon', 'code name discountType discountValue')
            .sort(sortOptions)
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await SystemOrder_1.default.countDocuments(query);
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
        console.error('Error getting user orders:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getUserOrders = getUserOrders;
// Get single order
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await SystemOrder_1.default.findOne({
            _id: id,
            user: req.user?.id
        })
            .populate('items.product', 'name images price pointsReward')
            .populate('coupon', 'code name discountType discountValue');
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
// Create order from cart
const createOrder = async (req, res) => {
    try {
        const { shippingAddress, paymentMethod, deliveryMethod = 'shipping', pickupBranchId, couponCode = '', usePoints = 0 } = req.body;
        // Check if user has completed profile
        const user = await user_1.default.findById(req.user?.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        if (deliveryMethod === 'shipping' && (!user.phone || !user.address.street) && (!shippingAddress?.street)) {
            return res.status(400).json({
                success: false,
                message: 'Please complete your profile or provide shipping address'
            });
        }
        if (deliveryMethod === 'pickup' && !pickupBranchId) {
            return res.status(400).json({
                success: false,
                message: 'Please select a branch for pickup'
            });
        }
        // Get cart
        const cart = await Cart_1.default.findOne({ user: req.user?.id })
            .populate('items.product', 'name price stock pointsReward')
            .populate('coupon', 'code discountType discountValue pointsBonus');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }
        // Validate stock and calculate totals
        let subtotal = 0;
        let pointsEarned = 0;
        const orderItems = [];
        for (const item of cart.items) {
            const product = item.product;
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }
            const itemPrice = Number(item.price ?? product.price) || 0;
            // Backfill missing legacy price into cart for consistency
            if (!item.price) {
                item.price = itemPrice;
            }
            const itemTotal = item.quantity * itemPrice;
            subtotal += itemTotal;
            pointsEarned += item.quantity * product.pointsReward;
            orderItems.push({
                product: product._id,
                quantity: item.quantity,
                price: itemPrice,
                pointsEarned: item.quantity * product.pointsReward,
                variant: item.variant
            });
        }
        // Persist any cart item price backfills before proceeding
        try {
            await cart.save();
        }
        catch { }
        // Apply coupon discount
        let discountAmount = 0;
        let coupon = null;
        if (couponCode) {
            coupon = await Coupon_1.default.findOne({ code: couponCode });
            if (coupon && coupon.isValid()) {
                const canBeUsed = coupon.canBeUsedBy(req.user?.id, subtotal, cart.items.map((item) => ({
                    product: item.product._id,
                    quantity: item.quantity
                })));
                if (canBeUsed) {
                    if (coupon.discountType === 'percentage') {
                        discountAmount = (subtotal * coupon.discountValue) / 100;
                    }
                    else if (coupon.discountType === 'fixed_amount') {
                        discountAmount = Math.min(coupon.discountValue, subtotal);
                    }
                }
            }
        }
        // Apply points discount
        let pointsUsed = 0;
        if (usePoints > 0 && user.points >= usePoints) {
            pointsUsed = Math.min(usePoints, subtotal - discountAmount);
            discountAmount += pointsUsed;
        }
        // Calculate shipping (simplified - free shipping over certain amount or with coupon)
        let shippingCost = 0;
        if (coupon && coupon.discountType === 'free_shipping') {
            shippingCost = 0;
        }
        else if (subtotal - discountAmount < 1000) { // Free shipping over 1000
            shippingCost = 100; // Fixed shipping cost
        }
        // Bank transfer bonus points
        if (paymentMethod === 'bank_transfer') {
            pointsEarned += 100;
        }
        const totalAmount = Math.max(0, subtotal - discountAmount + shippingCost);
        // Create system order (user orders use system-order API cluster)
        const sysOrder = new SystemOrder_1.default({
            user: req.user?.id,
            orderType: 'shop',
            items: orderItems.map((it) => ({
                product: it.product,
                quantity: it.quantity,
                price: it.price,
            })),
            subtotal,
            shippingCost,
            discountAmount,
            totalAmount,
            couponCode: couponCode || '',
            paymentMethod,
            // For bank transfer: waiting for user to transfer and submit proof
            // For COD: payment is not yet made; mark as pending and process order
            paymentStatus: paymentMethod === 'bank_transfer' ? 'pending' : 'pending',
            status: paymentMethod === 'bank_transfer' ? 'waiting_payment' : 'processing',
            pointsUsed,
            pointsEarned,
            shippingAddress: deliveryMethod === 'shipping' ? shippingAddress : undefined,
            deliveryMethod,
            pickupBranch: deliveryMethod === 'pickup' ? pickupBranchId : undefined
        });
        await sysOrder.save();
        // Update product stock
        for (const item of cart.items) {
            const product = item.product;
            await Product_1.default.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity, purchaseCount: item.quantity } });
        }
        // Update coupon usage
        if (coupon) {
            coupon.usedCount += 1;
            coupon.totalDiscountGiven += discountAmount;
            coupon.totalOrdersAffected += 1;
            await coupon.save();
        }
        // Update user points
        if (pointsUsed > 0) {
            user.points -= pointsUsed;
        }
        await user.save();
        // Clear cart
        cart.items = [];
        cart.coupon = undefined;
        cart.couponCode = '';
        await cart.save();
        res.status(201).json({ success: true, data: sysOrder, message: 'Order created successfully' });
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createOrder = createOrder;
// Submit payment confirmation
const submitPaymentConfirmation = async (req, res) => {
    try {
        const { orderId, paymentImage, note } = req.body; // paymentImage should be Cloudinary URL
        const order = await SystemOrder_1.default.findOne({
            _id: orderId,
            user: req.user?.id
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.paymentMethod !== 'bank_transfer') {
            return res.status(400).json({
                success: false,
                message: 'This order does not require payment confirmation'
            });
        }
        // Allow initial submit and re-submit while waiting for admin confirmation
        if (!['pending', 'waiting_confirmation'].includes(order.paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Payment confirmation not allowed at this stage'
            });
        }
        order.paymentConfirmation = {
            image: paymentImage,
            note: note || '',
            submittedAt: new Date()
        };
        order.paymentStatus = 'waiting_confirmation';
        order.status = 'waiting_confirmation';
        await order.save();
        res.json({
            success: true,
            data: order,
            message: 'Payment confirmation submitted successfully'
        });
    }
    catch (error) {
        console.error('Error submitting payment confirmation:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.submitPaymentConfirmation = submitPaymentConfirmation;
// Confirm order delivery
const confirmDelivery = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await SystemOrder_1.default.findOne({
            _id: orderId,
            user: req.user?.id
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Order is not in delivered status'
            });
        }
        order.status = 'completed';
        await order.save();
        // Add points to user
        const user = await user_1.default.findById(req.user?.id);
        if (user) {
            user.points += order.pointsEarned;
            await user.save();
            try {
                await point_transaction_1.default.create({
                    userId: user._id,
                    amount: Math.max(0, Number(order.pointsEarned || 0)),
                    reason: 'order-completion',
                    notes: `Order ${order.orderNumber}`,
                });
            }
            catch (err) {
                console.warn('Failed to log point transaction for completed order', err);
            }
        }
        res.json({
            success: true,
            data: order,
            message: 'Order completed successfully'
        });
    }
    catch (error) {
        console.error('Error confirming delivery:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.confirmDelivery = confirmDelivery;
// User marks order as delivered (when status is shipped)
const markDelivered = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await SystemOrder_1.default.findOne({
            _id: orderId,
            user: req.user?.id
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.status !== 'shipped') {
            return res.status(400).json({
                success: false,
                message: 'Order is not in shipped status'
            });
        }
        order.status = 'delivered';
        order.deliveredAt = new Date();
        await order.save();
        res.json({
            success: true,
            data: order,
            message: 'Order marked as delivered'
        });
    }
    catch (error) {
        console.error('Error marking delivered:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.markDelivered = markDelivered;
// Cancel order
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const order = await SystemOrder_1.default.findOne({
            _id: orderId,
            user: req.user?.id
        });
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
        order.cancellationReason = reason || 'Cancelled by customer';
        // Refund stock
        for (const item of order.items) {
            await Product_1.default.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, purchaseCount: -item.quantity } });
        }
        // Refund points if any were used
        if (order.pointsUsed > 0) {
            const user = await user_1.default.findById(req.user?.id);
            if (user) {
                user.points += order.pointsUsed;
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
// Purchase suggestion package
const purchaseSuggestionPackage = async (req, res) => {
    try {
        const { packageId } = req.body;
        const pkg = await SuggestionPackage_1.default.findById(packageId);
        if (!pkg || !pkg.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Suggestion package not found'
            });
        }
        // Load user and ensure enough points based on package price directly
        const purchaser = await user_1.default.findById(req.user?.id);
        if (!purchaser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        // Do not allow purchase when an active, unexpired package still has remaining suggestions
        const existingActive = await UserSuggestion_1.default.findOne({
            user: req.user?.id,
            isActive: true,
            validUntil: { $gte: new Date() },
            remainingSuggestions: { $gt: 0 },
        });
        if (existingActive) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã có gói gợi ý đang hoạt động. Vui lòng dùng hết hoặc đợi hết hạn trước khi mua thêm.',
            });
        }
        // Deduct points equal to package price (no conversion)
        const pointsToDeduct = Math.max(0, Number(pkg.price) || 0);
        if (pointsToDeduct <= 0) {
            return res.status(400).json({ success: false, message: 'Giá gói không hợp lệ' });
        }
        if ((purchaser.points || 0) < pointsToDeduct) {
            return res.status(400).json({ success: false, message: 'Số điểm của bạn không đủ để mua gói này' });
        }
        // Create a SystemOrder for suggestion package (no physical shipment)
        const safe = (s) => (s && String(s).trim().length > 0 ? String(s).trim() : 'N/A');
        const addr = purchaser?.address || {};
        const sysOrder = new SystemOrder_1.default({
            user: req.user?.id,
            orderType: 'suggestion_package',
            items: [{
                    product: null,
                    name: `Gói gợi ý: ${pkg.name}`,
                    image: '',
                    quantity: 1,
                    price: pkg.price,
                }],
            subtotal: pkg.price,
            shippingCost: 0,
            discountAmount: 0,
            totalAmount: pkg.price,
            pointsUsed: pointsToDeduct,
            pointsEarned: 0,
            couponCode: '',
            paymentMethod: 'bank_transfer',
            paymentStatus: 'paid',
            status: 'completed',
            shippingAddress: {
                name: safe(purchaser?.name),
                phone: safe(purchaser?.phone),
                street: safe(addr.street),
                city: safe(addr.city),
                state: safe(addr.state),
                postalCode: safe(addr.postalCode),
                country: safe(addr.country),
                notes: 'Suggestion package order (digital, points deducted)'
            }
        });
        await sysOrder.save();
        // Deduct user points immediately
        purchaser.points = Math.max(0, (purchaser.points || 0) - pointsToDeduct);
        // Ensure array exists before pushing
        if (!Array.isArray(purchaser.suggestionPackages)) {
            purchaser.suggestionPackages = [];
        }
        // Create user suggestion record
        const userSuggestion = new UserSuggestion_1.default({
            user: req.user?.id,
            package: packageId,
            totalSuggestions: pkg.suggestionCount,
            usedSuggestions: 0,
            remainingSuggestions: pkg.suggestionCount,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000),
            purchasePrice: pkg.price,
            orderId: sysOrder._id
        });
        await userSuggestion.save();
        // Update package statistics
        pkg.purchaseCount += 1;
        pkg.totalRevenue += pkg.price;
        await pkg.save();
        // Update user's suggestion packages
        purchaser.suggestionPackages.push(userSuggestion._id);
        await purchaser.save();
        res.status(201).json({
            success: true,
            data: {
                order: sysOrder,
                userSuggestion
            },
            message: 'Suggestion package purchased successfully'
        });
    }
    catch (error) {
        console.error('Error purchasing suggestion package:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.purchaseSuggestionPackage = purchaseSuggestionPackage;
// Get user's suggestion packages
const getUserSuggestionPackages = async (req, res) => {
    try {
        const userSuggestions = await UserSuggestion_1.default.find({
            user: req.user?.id,
            isActive: true
        })
            .populate('package', 'name description suggestionCount validityDays')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: userSuggestions });
    }
    catch (error) {
        console.error('Error getting user suggestion packages:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getUserSuggestionPackages = getUserSuggestionPackages;
// Purchase points (create an order for adding points after completion)
const purchasePoints = async (req, res) => {
    try {
        const { amount } = req.body; // amount in currency user will transfer
        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        // Points awarded equal to amount (1:1)
        const points = Math.floor(numericAmount);
        console.log(`Creating points order: amount=${numericAmount}, pointsEarned=${points}`);
        // Create a SystemOrder so it is managed in the same admin flow
        // Populate shipping address with user's existing info or safe fallbacks
        const purchaser = await user_1.default.findById(req.user?.id);
        const safe = (s) => (s && String(s).trim().length > 0 ? String(s).trim() : 'N/A');
        const addr = purchaser?.address || {};
        const sysOrder = new SystemOrder_1.default({
            user: req.user?.id,
            orderType: 'points_topup',
            items: [{
                    product: null,
                    name: 'Nạp điểm',
                    image: '',
                    quantity: 1,
                    price: numericAmount,
                }],
            subtotal: numericAmount,
            shippingCost: 0,
            discountAmount: 0,
            totalAmount: numericAmount,
            pointsUsed: 0,
            pointsEarned: points,
            couponCode: '',
            paymentMethod: 'bank_transfer',
            paymentStatus: 'pending',
            status: 'waiting_payment',
            shippingAddress: {
                name: safe(purchaser?.name),
                phone: safe(purchaser?.phone),
                street: safe(addr.street),
                city: safe(addr.city),
                state: safe(addr.state),
                postalCode: safe(addr.postalCode),
                country: safe(addr.country),
                notes: 'Points top-up order (no physical shipment)'
            }
        });
        await sysOrder.save();
        res.status(201).json({ success: true, data: sysOrder, message: 'Points purchase order created' });
    }
    catch (error) {
        console.error('Error purchasing points:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.purchasePoints = purchasePoints;
//# sourceMappingURL=order.controller.js.map