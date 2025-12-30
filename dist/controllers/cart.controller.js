"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCoupon = exports.applyCoupon = exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const Cart_1 = __importDefault(require("../models/Cart"));
const Product_1 = __importDefault(require("../models/Product"));
const Coupon_1 = __importDefault(require("../models/Coupon"));
// Helper to get cart identifier (user ID or guestId)
const getCartIdentifier = (req) => {
    if (req.user?.id) {
        return { user: req.user.id };
    }
    const guestId = req.header('X-Guest-Id') || req.body.guestId;
    if (guestId) {
        return { guestId };
    }
    return null;
};
// Get user's or guest's cart
const getCart = async (req, res) => {
    try {
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return res.json({ success: true, data: { items: [], total: 0, subtotal: 0, discount: 0 } });
        }
        const cart = await Cart_1.default.findOne(identifier)
            .populate('items.product', 'name images price originalPrice stock pointsReward')
            .populate('coupon', 'code name discountType discountValue pointsBonus');
        if (!cart) {
            return res.json({ success: true, data: { items: [], total: 0, subtotal: 0, discount: 0 } });
        }
        // Calculate totals
        let subtotal = 0;
        let total = 0;
        let discount = 0;
        cart.items.forEach((item) => {
            const itemTotal = item.quantity * item.price;
            subtotal += itemTotal;
        });
        // Apply coupon discount if exists
        if (cart.coupon) {
            if (cart.coupon.discountType === 'percentage') {
                discount = (subtotal * cart.coupon.discountValue) / 100;
            }
            else if (cart.coupon.discountType === 'fixed_amount') {
                discount = Math.min(cart.coupon.discountValue, subtotal);
            }
        }
        total = subtotal - discount;
        res.json({
            success: true,
            data: {
                ...cart.toObject(),
                subtotal,
                total,
                discount
            }
        });
    }
    catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getCart = getCart;
// Add item to cart
const addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1, variant } = req.body;
        // Check if product exists and is active
        const product = await Product_1.default.findOne({ _id: productId, isActive: true });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or not available'
            });
        }
        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock'
            });
        }
        // Get or create cart
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Guest ID required for guest users'
            });
        }
        let cart = await Cart_1.default.findOne(identifier);
        if (!cart) {
            cart = new Cart_1.default({ ...identifier, items: [] });
        }
        // Normalize variant - treat empty object, null, and undefined as the same
        const normalizedVariant = variant && Object.keys(variant).length > 0 ? variant : null;
        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex((item) => {
            const itemVariant = item.variant && Object.keys(item.variant).length > 0 ? item.variant : null;
            const isSameProduct = item.product.toString() === productId;
            const isSameVariant = JSON.stringify(itemVariant) === JSON.stringify(normalizedVariant);
            return isSameProduct && isSameVariant;
        });
        if (existingItemIndex > -1) {
            // Update quantity
            cart.items[existingItemIndex].quantity += quantity;
            // Ensure price is set in case of legacy carts
            cart.items[existingItemIndex].price = Number(product.price) || 0;
        }
        else {
            // Add new item with snapshot price
            cart.items.push({
                product: productId,
                quantity,
                price: Number(product.price) || 0,
                variant: normalizedVariant,
                addedAt: new Date()
            });
        }
        await cart.save();
        res.json({
            success: true,
            message: 'Item added to cart successfully',
            data: cart
        });
    }
    catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.addToCart = addToCart;
// Update cart item quantity
const updateCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;
        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Guest ID required for guest users'
            });
        }
        const cart = await Cart_1.default.findOne(identifier);
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }
        // Check stock
        const product = await Product_1.default.findById(item.product);
        if (product && product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock'
            });
        }
        item.quantity = quantity;
        await cart.save();
        res.json({
            success: true,
            message: 'Cart item updated successfully',
            data: cart
        });
    }
    catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateCartItem = updateCartItem;
// Remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Guest ID required for guest users'
            });
        }
        const cart = await Cart_1.default.findOne(identifier);
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        cart.items.pull(itemId);
        await cart.save();
        res.json({
            success: true,
            message: 'Item removed from cart successfully',
            data: cart
        });
    }
    catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.removeFromCart = removeFromCart;
// Clear cart
const clearCart = async (req, res) => {
    try {
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Guest ID required for guest users'
            });
        }
        const cart = await Cart_1.default.findOne(identifier);
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        cart.items = [];
        cart.coupon = undefined;
        cart.couponCode = '';
        await cart.save();
        res.json({
            success: true,
            message: 'Cart cleared successfully',
            data: cart
        });
    }
    catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.clearCart = clearCart;
// Apply coupon to cart
const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Guest ID required for guest users'
            });
        }
        const cart = await Cart_1.default.findOne(identifier)
            .populate('items.product', 'name price category');
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        if (cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }
        // Find coupon
        const coupon = await Coupon_1.default.findOne({ code: couponCode });
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }
        // Calculate order amount
        const orderAmount = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        // Validate coupon (only for logged-in users)
        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                message: 'Please login to use coupons'
            });
        }
        const canBeUsed = coupon.canBeUsedBy(req.user.id, orderAmount, cart.items.map((item) => ({
            product: item.product._id,
            quantity: item.quantity
        })));
        if (!canBeUsed) {
            return res.status(400).json({
                success: false,
                message: 'Coupon cannot be used for this order'
            });
        }
        cart.coupon = coupon._id;
        cart.couponCode = couponCode;
        await cart.save();
        res.json({
            success: true,
            message: 'Coupon applied successfully',
            data: cart
        });
    }
    catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.applyCoupon = applyCoupon;
// Remove coupon from cart
const removeCoupon = async (req, res) => {
    try {
        const identifier = getCartIdentifier(req);
        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Guest ID required for guest users'
            });
        }
        const cart = await Cart_1.default.findOne(identifier);
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }
        cart.coupon = undefined;
        cart.couponCode = '';
        await cart.save();
        res.json({
            success: true,
            message: 'Coupon removed successfully',
            data: cart
        });
    }
    catch (error) {
        console.error('Error removing coupon:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.removeCoupon = removeCoupon;
//# sourceMappingURL=cart.controller.js.map