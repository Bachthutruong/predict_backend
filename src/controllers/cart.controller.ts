import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Cart from '../models/Cart';
import Product from '../models/Product';
import Coupon from '../models/Coupon';

// Get user's cart
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user?.id })
      .populate('items.product', 'name images price originalPrice stock pointsReward')
      .populate('coupon', 'code name discountType discountValue pointsBonus');

    if (!cart) {
      return res.json({ success: true, data: { items: [], total: 0, subtotal: 0, discount: 0 } });
    }

    // Calculate totals
    let subtotal = 0;
    let total = 0;
    let discount = 0;

    cart.items.forEach((item: any) => {
      const itemTotal = item.quantity * item.price;
      subtotal += itemTotal;
    });

    // Apply coupon discount if exists
    if (cart.coupon) {
      if (cart.coupon.discountType === 'percentage') {
        discount = (subtotal * cart.coupon.discountValue) / 100;
      } else if (cart.coupon.discountType === 'fixed_amount') {
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
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Add item to cart
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity = 1, variant } = req.body;

    // Check if product exists and is active
    const product = await Product.findOne({ _id: productId, isActive: true });
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
    let cart = await Cart.findOne({ user: req.user?.id });
    if (!cart) {
      cart = new Cart({ user: req.user?.id, items: [] });
    }

    // Normalize variant - treat empty object, null, and undefined as the same
    const normalizedVariant = variant && Object.keys(variant).length > 0 ? variant : null;

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex((item: any) => {
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
    } else {
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
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ user: req.user?.id });
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
    const product = await Product.findById(item.product);
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
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Remove item from cart
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user?.id });
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
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Clear cart
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user?.id });
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
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Apply coupon to cart
export const applyCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user?.id })
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
    const coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Calculate order amount
    const orderAmount = cart.items.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.price), 0
    );

    // Validate coupon
    const canBeUsed = coupon.canBeUsedBy(
      req.user?.id,
      orderAmount,
      cart.items.map((item: any) => ({
        product: item.product._id,
        quantity: item.quantity
      }))
    );

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
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Remove coupon from cart
export const removeCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const cart = await Cart.findOne({ user: req.user?.id });
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
  } catch (error) {
    console.error('Error removing coupon:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
