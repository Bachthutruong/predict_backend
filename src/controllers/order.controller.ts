import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SystemOrder from '../models/SystemOrder';
import Cart from '../models/Cart';
import User from '../models/user';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import UserSuggestion from '../models/UserSuggestion';
import SuggestionPackage from '../models/SuggestionPackage';
import { computePointsFromAmount } from './settings.controller';
import PointTransaction from '../models/point-transaction';

// Get user's orders
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      orderType = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query: any = { user: req.user?.id };

    if (status) {
      query.status = status;
    }
    if (orderType) {
      query.orderType = orderType;
    }

    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const orders = await SystemOrder.find(query)
      .populate('items.product', 'name images price')
      .populate('coupon', 'code name discountType discountValue')
      .sort(sortOptions)
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await SystemOrder.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error getting user orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get single order
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Build query - if user is logged in, check by user ID; if guest, allow access by order ID
    const query: any = { _id: id };
    
    // If user is logged in, only show their orders
    // If guest, allow access (they can only access orders they just created)
    if (req.user?.id) {
      query.user = req.user.id;
    }
    // For guests, we don't restrict by user (they can view order by ID)
    
    const order = await SystemOrder.findOne(query)
      .populate('items.product', 'name images price pointsReward')
      .populate('coupon', 'code name discountType discountValue');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create order from cart
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      shippingAddress,
      paymentMethod,
      deliveryMethod = 'shipping',
      pickupBranchId,
      couponCode = '',
      usePoints = 0,
      selectedItemIds = [] // Array of selected cart item IDs
    } = req.body;

    const isGuest = !req.user?.id;
    const { guestId } = req.body;

    // For logged-in users, check profile
    let user = null;
    if (req.user?.id) {
      user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (deliveryMethod === 'shipping' && (!user.phone || !user.address.street) && (!shippingAddress?.street)) {
        return res.status(400).json({
          success: false,
          message: 'Please complete your profile or provide shipping address'
        });
      }
    } else {
      // For guests, require shipping address
      if (deliveryMethod === 'shipping' && (!shippingAddress?.street || !shippingAddress?.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide shipping address and phone number'
        });
      }
    }

    if (deliveryMethod === 'pickup' && !pickupBranchId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a branch for pickup'
      });
    }

    // Get cart - for users, get user cart; for guests, get guest cart
    let cart = null;
    if (req.user?.id) {
      // Get user cart, or merge guest cart if provided
      cart = await Cart.findOne({ user: req.user.id })
        .populate('items.product', 'name price stock pointsReward')
        .populate('coupon', 'code discountType discountValue pointsBonus');

      // If user has a guest cart to merge (from localStorage)
      if (guestId && guestId !== req.user.id) {
        const guestCart = await Cart.findOne({ guestId })
          .populate('items.product', 'name price stock pointsReward')
          .populate('coupon', 'code discountType discountValue pointsBonus');

        if (guestCart && guestCart.items.length > 0) {
          if (!cart) {
            // Create new cart from guest cart
            cart = new Cart({
              user: req.user.id,
              items: guestCart.items,
              coupon: guestCart.coupon,
              couponCode: guestCart.couponCode
            });
            await cart.save();
            // Delete guest cart
            await Cart.deleteOne({ guestId });
          } else {
            // Merge guest cart items into user cart
            for (const guestItem of guestCart.items) {
              const existingItemIndex = cart.items.findIndex((item: any) => {
                const itemVariant = item.variant && Object.keys(item.variant).length > 0 ? item.variant : null;
                const guestVariant = guestItem.variant && Object.keys(guestItem.variant).length > 0 ? guestItem.variant : null;
                const isSameProduct = item.product.toString() === guestItem.product.toString();
                const isSameVariant = JSON.stringify(itemVariant) === JSON.stringify(guestVariant);
                return isSameProduct && isSameVariant;
              });

              if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity += guestItem.quantity;
              } else {
                cart.items.push(guestItem);
              }
            }
            // Use guest cart coupon if user cart doesn't have one
            if (!cart.coupon && guestCart.coupon) {
              cart.coupon = guestCart.coupon;
              cart.couponCode = guestCart.couponCode;
            }
            await cart.save();
            // Delete guest cart
            await Cart.deleteOne({ guestId });
          }
        }
      }
    } else {
      // Guest checkout - get guest cart
      if (!guestId) {
        return res.status(400).json({
          success: false,
          message: 'Guest ID is required for guest checkout'
        });
      }
      cart = await Cart.findOne({ guestId })
        .populate('items.product', 'name price stock pointsReward')
        .populate('coupon', 'code discountType discountValue pointsBonus');
    }

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Filter cart items to only include selected items (if any selected)
    let itemsToProcess = cart.items;
    if (selectedItemIds && selectedItemIds.length > 0) {
      itemsToProcess = cart.items.filter((item: any) => 
        selectedItemIds.includes(item._id.toString())
      );
      
      if (itemsToProcess.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No items selected for checkout'
        });
      }
    }

    // Validate stock and calculate totals
    let subtotal = 0;
    let pointsEarned = 0;
    const orderItems = [];

    for (const item of itemsToProcess) {
      const product = item.product as any;

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      const itemPrice = Number((item as any).price ?? product.price) || 0;
      // Backfill missing legacy price into cart for consistency
      if (!(item as any).price) {
        (item as any).price = itemPrice;
      }
      const itemTotal = item.quantity * itemPrice;
      subtotal += itemTotal;
      
      // Calculate points: ensure pointsReward is a valid number
      const productPointsReward = Number(product.pointsReward || 0);
      const itemQuantity = Number(item.quantity || 1);
      const itemPointsEarned = productPointsReward * itemQuantity;
      pointsEarned += itemPointsEarned;
      
      console.log(`[Order] Product ${product.name}: ${itemQuantity} x ${productPointsReward} points = ${itemPointsEarned} points`);

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: itemPrice,
        pointsEarned: itemPointsEarned,
        variant: item.variant
      });
    }

    // Persist any cart item price backfills before proceeding
    try { await cart.save(); } catch { }

    // Apply coupon discount
    let discountAmount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode });
      if (coupon && coupon.isValid()) {
        // For guests, skip user-specific validation
        const canBeUsed = isGuest ? true : coupon.canBeUsedBy(
          req.user?.id,
          subtotal,
          cart.items.map((item: any) => ({
            product: item.product._id,
            quantity: item.quantity
          }))
        );

        if (canBeUsed) {
          if (coupon.discountType === 'percentage') {
            discountAmount = (subtotal * coupon.discountValue) / 100;
          } else if (coupon.discountType === 'fixed_amount') {
            discountAmount = Math.min(coupon.discountValue, subtotal);
          }
        }
      }
    }

    // Apply points discount (only for logged-in users)
    let pointsUsed = 0;
    if (!isGuest && usePoints > 0 && user && user.points >= usePoints) {
      pointsUsed = Math.min(usePoints, subtotal - discountAmount);
      discountAmount += pointsUsed;
    }

    // Calculate shipping (simplified - free shipping over certain amount or with coupon)
    let shippingCost = 0;
    if (coupon && coupon.discountType === 'free_shipping') {
      shippingCost = 0;
    } else if (subtotal - discountAmount < 1000) { // Free shipping over 1000
      shippingCost = 100; // Fixed shipping cost
    }

    // Guest users don't earn points
    if (isGuest) {
      console.log(`[Order] Guest order - setting pointsEarned to 0`);
      pointsEarned = 0;
    }
    
    console.log(`[Order] Total pointsEarned calculated: ${pointsEarned} (from ${itemsToProcess.length} items)`);

    const totalAmount = Math.max(0, subtotal - discountAmount + shippingCost);

    // Prepare shipping address - always required by model, even for pickup
    // Helper function to ensure non-empty string values
    const ensureNonEmpty = (value: any, defaultValue: string): string => {
      if (value && typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      return defaultValue;
    };

    let finalShippingAddress: any;
    
    // For pickup orders, we still need a valid address (can use minimal info)
    if (deliveryMethod === 'pickup') {
      // For pickup, use provided address or user's address, or minimal address
      if (user && user.address && user.address.street && user.address.street.trim()) {
        finalShippingAddress = {
          name: ensureNonEmpty(user.name || shippingAddress?.name, 'Customer'),
          phone: ensureNonEmpty(user.phone || shippingAddress?.phone, 'N/A'),
          street: ensureNonEmpty(user.address.street, 'Store Pickup'),
          city: ensureNonEmpty(user.address.city, 'N/A'),
          state: ensureNonEmpty(user.address.state, 'VN'),
          postalCode: ensureNonEmpty(user.address.postalCode, '10000'),
          country: ensureNonEmpty(user.address.country, 'Vietnam'),
          notes: 'Store pickup order'
        };
      } else if (shippingAddress && shippingAddress.street && shippingAddress.street.trim()) {
        finalShippingAddress = {
          name: ensureNonEmpty(shippingAddress.name, 'Customer'),
          phone: ensureNonEmpty(shippingAddress.phone, 'N/A'),
          street: ensureNonEmpty(shippingAddress.street, 'Store Pickup'),
          city: ensureNonEmpty(shippingAddress.city, 'N/A'),
          state: ensureNonEmpty(shippingAddress.state, 'VN'),
          postalCode: ensureNonEmpty(shippingAddress.postalCode, '10000'),
          country: ensureNonEmpty(shippingAddress.country, 'Vietnam'),
          notes: 'Store pickup order'
        };
      } else {
        // Minimal address for pickup (required by model)
        finalShippingAddress = {
          name: 'Customer',
          phone: 'N/A',
          street: 'Store Pickup',
          city: 'N/A',
          state: 'VN',
          postalCode: '10000',
          country: 'Vietnam',
          notes: 'Store pickup order'
        };
      }
    } else {
      // For shipping, must have valid address
      if (user && user.address && user.address.street && user.address.street.trim()) {
        finalShippingAddress = {
          name: ensureNonEmpty(user.name || shippingAddress?.name, 'Customer'),
          phone: ensureNonEmpty(user.phone || shippingAddress?.phone, 'N/A'),
          street: ensureNonEmpty(user.address.street || shippingAddress?.street, 'N/A'),
          city: ensureNonEmpty(user.address.city || shippingAddress?.city, 'N/A'),
          state: ensureNonEmpty(user.address.state || shippingAddress?.state, 'VN'),
          postalCode: ensureNonEmpty(user.address.postalCode || shippingAddress?.postalCode, '10000'),
          country: ensureNonEmpty(user.address.country || shippingAddress?.country, 'Vietnam'),
          notes: shippingAddress?.notes || ''
        };
      } else if (shippingAddress) {
        finalShippingAddress = {
          name: ensureNonEmpty(shippingAddress.name, 'Customer'),
          phone: ensureNonEmpty(shippingAddress.phone, 'N/A'),
          street: ensureNonEmpty(shippingAddress.street, 'N/A'),
          city: ensureNonEmpty(shippingAddress.city, 'N/A'),
          state: ensureNonEmpty(shippingAddress.state, 'VN'),
          postalCode: ensureNonEmpty(shippingAddress.postalCode, '10000'),
          country: ensureNonEmpty(shippingAddress.country, 'Vietnam'),
          notes: shippingAddress.notes || ''
        };
      } else {
        // This should not happen if validation works, but provide fallback
        finalShippingAddress = {
          name: 'Customer',
          phone: 'N/A',
          street: 'N/A',
          city: 'N/A',
          state: 'VN',
          postalCode: '10000',
          country: 'Vietnam',
          notes: ''
        };
      }
    }

    // Create system order (user orders use system-order API cluster)
    const sysOrder = new SystemOrder({
      user: req.user?.id || undefined, // Guest orders have no user
      orderType: 'shop',
      items: orderItems.map((it: any) => ({
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
      shippingAddress: finalShippingAddress, // Always provide shipping address
      deliveryMethod,
      pickupBranch: deliveryMethod === 'pickup' ? pickupBranchId : undefined
    });

    await sysOrder.save();

    // Update product stock (only for selected items)
    for (const item of itemsToProcess) {
      const product = item.product as any;
      await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -item.quantity, purchaseCount: item.quantity } }
      );
    }

    // Update coupon usage
    if (coupon) {
      coupon.usedCount += 1;
      coupon.totalDiscountGiven += discountAmount;
      coupon.totalOrdersAffected += 1;
      await coupon.save();
    }

    // Update user points (only for logged-in users)
    if (!isGuest && user && pointsUsed > 0) {
      user.points -= pointsUsed;
      await user.save();
    }

    // Remove ordered items from cart (only selected items)
    if (selectedItemIds && selectedItemIds.length > 0) {
      cart.items = cart.items.filter((item: any) => 
        !selectedItemIds.includes(item._id.toString())
      );
    } else {
      // If no selection, clear entire cart
      cart.items = [];
      cart.coupon = undefined;
      cart.couponCode = '';
    }
    await cart.save();

    res.status(201).json({ success: true, data: sysOrder, message: 'Order created successfully' });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Submit payment confirmation
export const submitPaymentConfirmation = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, paymentImage, note } = req.body; // paymentImage should be Cloudinary URL

    const order = await SystemOrder.findOne({
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
  } catch (error) {
    console.error('Error submitting payment confirmation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Confirm order delivery
export const confirmDelivery = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await SystemOrder.findOne({
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

    // Add points to user (only if not already awarded)
    const user = await User.findById(req.user?.id);
    if (user && order.pointsEarned > 0) {
      // Check if points were already awarded by checking PointTransaction
      const existingTransaction = await PointTransaction.findOne({
        userId: user._id,
        reason: 'order-completion',
        notes: { $regex: order.orderNumber }
      });
      
      if (!existingTransaction) {
        const oldPoints = Number(user.points || 0);
        const pointsToAdd = Number(order.pointsEarned || 0);
        user.points = Math.max(0, oldPoints) + pointsToAdd;
        await user.save();
        console.log(`[Order] ✅ Credited ${pointsToAdd} points to user ${user._id}. Old balance=${oldPoints}, New balance=${user.points}`);
        
        try {
          await PointTransaction.create({
            userId: user._id,
            amount: pointsToAdd,
            reason: 'order-completion',
            notes: `Order ${order.orderNumber}`,
          });
          console.log(`[Order] ✅ Point transaction logged for order ${order.orderNumber}`);
        } catch (err) {
          console.warn('[Order] Failed to log point transaction for completed order', err);
        }
      } else {
        console.log(`[Order] ⚠️ Points already awarded for order ${order.orderNumber}. Transaction ID: ${existingTransaction._id}`);
      }
    }

    res.json({
      success: true,
      data: order,
      message: 'Order completed successfully'
    });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// User marks order as delivered (when status is shipped)
export const markDelivered = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await SystemOrder.findOne({
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
  } catch (error) {
    console.error('Error marking delivered:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Cancel order
export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await SystemOrder.findOne({
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
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity, purchaseCount: -item.quantity } }
      );
    }

    // Refund points if any were used
    if (order.pointsUsed > 0) {
      const user = await User.findById(req.user?.id);
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
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Purchase suggestion package
export const purchaseSuggestionPackage = async (req: AuthRequest, res: Response) => {
  try {
    const { packageId } = req.body;

    const pkg = await SuggestionPackage.findById(packageId);
    if (!pkg || !pkg.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion package not found'
      });
    }

    // Load user and ensure enough points based on package price directly
    const purchaser = await User.findById(req.user?.id);
    if (!purchaser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Do not allow purchase when an active, unexpired package still has remaining suggestions
    const existingActive = await UserSuggestion.findOne({
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
    const safe = (s?: string) => (s && String(s).trim().length > 0 ? String(s).trim() : 'N/A');
    const addr: any = purchaser?.address || {};
    const sysOrder = new SystemOrder({
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
    if (!Array.isArray((purchaser as any).suggestionPackages)) {
      (purchaser as any).suggestionPackages = [];
    }

    // Create user suggestion record
    const userSuggestion = new UserSuggestion({
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
    (purchaser as any).suggestionPackages.push(userSuggestion._id);
    await purchaser.save();

    res.status(201).json({
      success: true,
      data: {
        order: sysOrder,
        userSuggestion
      },
      message: 'Suggestion package purchased successfully'
    });
  } catch (error) {
    console.error('Error purchasing suggestion package:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get user's suggestion packages
export const getUserSuggestionPackages = async (req: AuthRequest, res: Response) => {
  try {
    const userSuggestions = await UserSuggestion.find({
      user: req.user?.id,
      isActive: true
    })
      .populate('package', 'name description suggestionCount validityDays')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: userSuggestions });
  } catch (error) {
    console.error('Error getting user suggestion packages:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Purchase points (create an order for adding points after completion)
export const purchasePoints = async (req: AuthRequest, res: Response) => {
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
    const purchaser = await User.findById(req.user?.id);
    const safe = (s?: string) => (s && String(s).trim().length > 0 ? String(s).trim() : 'N/A');
    const addr: any = purchaser?.address || {};
    const sysOrder = new SystemOrder({
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
  } catch (error) {
    console.error('Error purchasing points:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
