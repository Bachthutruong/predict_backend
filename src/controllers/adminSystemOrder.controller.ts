import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SystemOrder from '../models/SystemOrder';
import Coupon from '../models/Coupon';
import User from '../models/user';
import PointTransaction from '../models/point-transaction';
import Product from '../models/Product';

export const listSystemOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status = '', paymentStatus = '', search = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query as any;
    const query: any = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: String(search), $options: 'i' } },
        { 'shippingAddress.name': { $regex: String(search), $options: 'i' } },
        { 'shippingAddress.phone': { $regex: String(search), $options: 'i' } }
      ];
    }
    const sortOptions: any = {}; sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const docs = await SystemOrder.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price')
      .sort(sortOptions).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    const total = await SystemOrder.countDocuments(query);
    res.json({ success: true, data: docs, pagination: { current: Number(page), pages: Math.ceil(total / Number(limit)), total } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSystemOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const order = await SystemOrder.findById(req.params.id)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name images price');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createSystemOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = new SystemOrder({ ...req.body });
    await order.save();
    // If a coupon was used, increment usage stats
    if (order.couponCode) {
      await Coupon.findOneAndUpdate(
        { code: order.couponCode },
        {
          $inc: {
            usedCount: 1,
            totalOrdersAffected: 1,
            totalDiscountGiven: Math.max(0, Number(order.discountAmount || 0))
          }
        }
      );
    }
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    // Surface validation errors to the client for easier debugging
    console.error('createSystemOrder error:', e);
    if ((e as any)?.name === 'ValidationError') {
      const details: any = {};
      Object.values((e as any).errors || {}).forEach((err: any) => {
        if (err?.path) details[err.path] = err.message;
      });
      return res.status(400).json({ success: false, message: 'Validation failed', details });
    }
    res.status(500).json({ success: false, message: (e as any)?.message || 'Internal server error' });
  }
};

export const updateSystemOrder = async (req: AuthRequest, res: Response) => {
  try {
    const existing = await SystemOrder.findById(req.params.id);
    const order = await SystemOrder.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('user', 'name email phone');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Adjust coupon usage if couponCode changed
    try {
      const oldCode = existing?.couponCode;
      const newCode = (req.body as any)?.couponCode;
      if (oldCode && oldCode !== newCode) {
        await Coupon.findOneAndUpdate(
          { code: oldCode },
          {
            $inc: {
              usedCount: -1,
              totalOrdersAffected: -1,
              totalDiscountGiven: -Math.max(0, Number(existing?.discountAmount || 0))
            }
          }
        );
      }
      if (newCode && oldCode !== newCode) {
        await Coupon.findOneAndUpdate(
          { code: newCode },
          {
            $inc: {
              usedCount: 1,
              totalOrdersAffected: 1,
              totalDiscountGiven: Math.max(0, Number(order.discountAmount || (req.body as any)?.discountAmount || 0))
            }
          }
        );
      }
    } catch {}
    res.json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteSystemOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await SystemOrder.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.couponCode) {
      await Coupon.findOneAndUpdate(
        { code: order.couponCode },
        {
          $inc: {
            usedCount: -1,
            totalOrdersAffected: -1,
            totalDiscountGiven: -Math.max(0, Number(order.discountAmount || 0))
          }
        }
      );
    }
    res.json({ success: true, message: 'Order deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateSystemOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminNotes } = req.body as any;
    // Populate user and items.product to get all needed data
    const order = await SystemOrder.findById(req.params.id)
      .populate('user', 'points')
      .populate('items.product', 'pointsReward');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    // Validate: Payment status must be 'paid' before allowing certain status changes
    const statusesRequiringPayment = ['processing', 'shipped', 'delivered', 'completed'];
    if (status && statusesRequiringPayment.includes(status) && order.paymentStatus !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot change order status to '${status}' because payment status is '${order.paymentStatus}'. Please update payment status to 'paid' first.` 
      });
    }
    
    const oldStatus = order.status;
    order.status = status || order.status; 
    if (adminNotes) order.adminNotes = adminNotes;
    
    if (status === 'shipped') order.shippedAt = new Date();
    if (status === 'delivered') order.deliveredAt = new Date();
    
    if (status === 'completed') {
      // Award points to user when completed (only if not already completed)
      if (oldStatus !== 'completed') {
        try {
          // Get user ID - handle both populated and non-populated cases
          let userId: string | undefined;
          if ((order as any).user) {
            userId = typeof (order as any).user === 'object' && (order as any).user._id 
              ? (order as any).user._id.toString() 
              : (order as any).user?.toString() || (order as any).user;
          }
          
          let pointsToAdd = Number(order.pointsEarned || 0);
          
          // Fallback: If pointsEarned is 0 or invalid, try to recalculate from items
          if ((!Number.isFinite(pointsToAdd) || pointsToAdd <= 0) && order.items && order.items.length > 0) {
            console.log(`[SystemOrder] pointsEarned is ${pointsToAdd}, recalculating from items for order ${order._id}`);
            pointsToAdd = 0;
            
            // Items are already populated above
            if (order.items) {
              for (const item of order.items) {
                const product = (item as any).product;
                if (product) {
                  const productPointsReward = Number(product.pointsReward || 0);
                  const itemQuantity = Number((item as any).quantity || 1);
                  const itemPoints = productPointsReward * itemQuantity;
                  pointsToAdd += itemPoints;
                  console.log(`[SystemOrder] Item ${product.name || product._id}: ${itemPoints} points (${productPointsReward} x ${itemQuantity})`);
                }
              }
            }
            
            // Update the order with recalculated points
            if (pointsToAdd > 0) {
              order.pointsEarned = pointsToAdd;
              console.log(`[SystemOrder] Recalculated pointsEarned=${pointsToAdd} for order ${order._id}`);
            }
          }
          
          console.log(`[SystemOrder] Completing order=${order._id} orderNumber=${order.orderNumber} user=${userId} paymentStatus=${order.paymentStatus} status=${order.status} pointsEarned=${pointsToAdd} itemsCount=${order.items?.length || 0}`);
          
          if (!userId) {
            console.warn(`[SystemOrder] No user id on order ${order._id} (orderNumber: ${order.orderNumber}), cannot credit points. This is likely a guest order.`);
          } else if (!Number.isFinite(pointsToAdd) || pointsToAdd <= 0) {
            console.warn(`[SystemOrder] pointsEarned invalid (${pointsToAdd}) for order ${order._id}. Items: ${order.items?.length || 0}`);
          } else {
            const user = await User.findById(userId);
            if (!user) {
              console.warn(`[SystemOrder] User ${userId} not found when crediting points for order ${order._id}`);
            } else {
              // Check if points were already awarded by checking PointTransaction
              const existingTransaction = await PointTransaction.findOne({
                userId: user._id,
                reason: 'order-completion',
                notes: { $regex: order.orderNumber }
              });
              
              if (!existingTransaction) {
                const oldPoints = Number(user.points || 0);
                user.points = Math.max(0, oldPoints) + pointsToAdd;
                await user.save();
                console.log(`[SystemOrder] ✅ Credited ${pointsToAdd} points to user ${user._id}. Old balance=${oldPoints}, New balance=${user.points}`);
                
                try {
                  await PointTransaction.create({
                    userId: user._id,
                    amount: pointsToAdd,
                    reason: 'order-completion',
                    notes: `Order ${order.orderNumber} (${order.orderType || 'shop'})`,
                  });
                  console.log(`[SystemOrder] ✅ Point transaction logged for order ${order.orderNumber}`);
                } catch (txErr) {
                  console.warn('[SystemOrder] Failed to log point transaction', txErr);
                }
              } else {
                console.log(`[SystemOrder] ⚠️ Points already awarded for order ${order.orderNumber}. Transaction ID: ${existingTransaction._id}`);
              }
            }
          }
          
          // Save order after updating pointsEarned (if recalculated)
          if (order.isModified('pointsEarned')) {
            await order.save();
          }
        } catch (error) {
          console.error('[SystemOrder] Error crediting points:', error);
        }
      }
    }
    
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      
      // If order was previously completed, revoke awarded points
      if (oldStatus === 'completed' && order.pointsEarned > 0) {
        try {
          const userId = (order as any).user?._id || (order as any).user || undefined;
          if (userId) {
            const user = await User.findById(userId);
            if (user) {
              user.points = Math.max(0, Number(user.points || 0) - Number(order.pointsEarned || 0));
              await user.save();
              console.log(`[SystemOrder] Revoked ${order.pointsEarned} points from user ${user._id} due to cancellation`);
            }
          }
        } catch (error) {
          console.error('[SystemOrder] Error revoking points:', error);
        }
      }
      
      // Refund points used (add back to user) if not already refunded
      if (!order.pointsRefunded && order.pointsUsed > 0) {
        try {
          const userId = (order as any).user?._id || (order as any).user || undefined;
          if (userId) {
            const user = await User.findById(userId);
            if (user) {
              user.points = Math.max(0, Number(user.points || 0) + Number(order.pointsUsed || 0));
              await user.save();
              order.pointsRefunded = true;
            }
          }
        } catch (error) {
          console.error('[SystemOrder] Error refunding points:', error);
        }
      }
    }
    
    await order.save();
    res.json({ success: true, data: order });
  } catch (e) {
    console.error('[SystemOrder] Error updating order status:', e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateSystemPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentStatus } = req.body as any;
    const order = await SystemOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.paymentStatus = paymentStatus || order.paymentStatus;
    if (paymentStatus === 'paid' && order.status === 'waiting_payment') order.status = 'processing';
    await order.save();
    res.json({ success: true, data: order });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getSystemOrderStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { period = '30' } = req.query as any;
    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const overviewAgg = await SystemOrder.aggregate([
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

    const statusBreakdown = await SystemOrder.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const paymentStatusBreakdown = await SystemOrder.aggregate([
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
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


