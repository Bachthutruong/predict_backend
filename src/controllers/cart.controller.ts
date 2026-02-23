import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Cart from '../models/Cart';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import GiftCampaign from '../models/GiftCampaign';

interface EligibleGiftCampaign {
  campaignId: string;
  name: string;
  description: string;
  requiredQuantity: number;
  allowMultiSelect: boolean;
  maxSelectableGifts: number;
  giftProducts: any[];
}

// Helper to get cart identifier (user ID or guestId)
// Accept guestId from header, body, or query (query helps when custom headers are stripped by proxy/CORS)
const getCartIdentifier = (req: AuthRequest) => {
  if (req.user?.id) {
    return { user: req.user.id };
  }
  const guestId = req.header('X-Guest-Id') || (req.body && req.body.guestId) || (req.query && (req.query.guestId as string));
  if (guestId && String(guestId).trim()) {
    return { guestId: String(guestId).trim() };
  }
  return null;
};

const computeEligibleGiftCampaigns = async (cart: any, sourceItems?: any[]): Promise<EligibleGiftCampaign[]> => {
  const items = Array.isArray(sourceItems) ? sourceItems : cart?.items;
  if (!cart || !items || items.length === 0) return [];
  const campaigns = await GiftCampaign.find({ isActive: true }).populate('giftProducts', 'name images isActive stock');

  const eligible: EligibleGiftCampaign[] = [];
  for (const campaign of campaigns) {
    const triggerProductIds = (campaign.triggerProducts || []).map((id: any) => id.toString());
    const relatedItems = triggerProductIds.length > 0
      ? items.filter((item: any) => {
        const itemProductId = item?.product?._id?.toString?.() || item?.product?.toString?.() || '';
        return triggerProductIds.includes(itemProductId);
      })
      : items;

    const totalQuantity = relatedItems.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
    if (totalQuantity < campaign.requiredQuantity) continue;

    const giftProducts = ((campaign as any).giftProducts || []).filter(
      (item: any) => item?.isActive && Number(item?.stock || 0) > 0
    );
    if (giftProducts.length === 0) continue;

    eligible.push({
      campaignId: campaign._id.toString(),
      name: campaign.name,
      description: campaign.description || '',
      requiredQuantity: campaign.requiredQuantity,
      allowMultiSelect: campaign.allowMultiSelect,
      maxSelectableGifts: campaign.maxSelectableGifts,
      giftProducts
    });
  }
  return eligible;
};

const sanitizeSelectedGifts = (selectedGifts: any[], eligible: EligibleGiftCampaign[]) => {
  if (!Array.isArray(selectedGifts) || selectedGifts.length === 0) return [];

  const eligibleByCampaign = new Map(eligible.map((item) => [item.campaignId, item]));

  const grouped = new Map<string, any[]>();
  for (const gift of selectedGifts) {
    const campaignId = gift?.campaign?.toString?.() || gift?.campaign?.toString?.() || '';
    if (!campaignId || !eligibleByCampaign.has(campaignId)) continue;
    if (!grouped.has(campaignId)) grouped.set(campaignId, []);
    grouped.get(campaignId)?.push(gift);
  }

  const normalized: any[] = [];
  grouped.forEach((items, campaignId) => {
    const campaign = eligibleByCampaign.get(campaignId);
    if (!campaign) return;

    const allowedGiftProductIds = new Set(campaign.giftProducts.map((p: any) => p._id.toString()));
    const cap = campaign.allowMultiSelect ? campaign.maxSelectableGifts : 1;
    let added = 0;

    for (const item of items) {
      if (added >= cap) break;
      const productId = item?.product?._id?.toString?.() || item?.product?.toString?.() || '';
      if (!productId || !allowedGiftProductIds.has(productId)) continue;
      normalized.push({
        campaign: campaignId,
        product: productId,
        quantity: 1,
        selectedAt: item.selectedAt || new Date()
      });
      added += 1;
    }
  });

  return normalized;
};

// Get user's or guest's cart
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const identifier = getCartIdentifier(req);
    
    if (!identifier) {
      return res.json({ success: true, data: { items: [], total: 0, subtotal: 0, discount: 0 } });
    }

    const cart = await Cart.findOne(identifier)
      .populate('items.product', 'name images price originalPrice stock pointsReward')
      .populate('coupon', 'code name discountType discountValue pointsBonus')
      .populate('selectedGifts.product', 'name images price');

    if (!cart) {
      return res.json({ success: true, data: { items: [], total: 0, subtotal: 0, discount: 0 } });
    }

    const selectedItemIdsQuery = String((req.query?.selectedItemIds as string) || '').trim();
    const selectedItemIdSet = new Set(
      selectedItemIdsQuery
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    );
    const usingSelectedSubset = selectedItemIdSet.size > 0;
    const itemsForEligibility = usingSelectedSubset
      ? cart.items.filter((item: any) => selectedItemIdSet.has(item?._id?.toString?.() || ''))
      : cart.items;

    const eligibleGiftCampaigns = await computeEligibleGiftCampaigns(cart, itemsForEligibility);
    const normalizedGifts = sanitizeSelectedGifts((cart as any).selectedGifts || [], eligibleGiftCampaigns);
    let responseSelectedGifts: any[] = (cart as any).selectedGifts || [];
    if (JSON.stringify(normalizedGifts) !== JSON.stringify((cart as any).selectedGifts || [])) {
      const giftProductMap = new Map<string, any>();
      eligibleGiftCampaigns.forEach((campaign) => {
        campaign.giftProducts.forEach((giftProduct: any) => {
          const productId = giftProduct?._id?.toString?.();
          if (productId) giftProductMap.set(productId, giftProduct);
        });
      });
      responseSelectedGifts = normalizedGifts.map((gift: any) => {
        const productId = gift?.product?.toString?.() || '';
        return {
          ...gift,
          product: giftProductMap.get(productId) || gift.product
        };
      });

      // Do not persist when evaluating only a selected checkout subset.
      if (!usingSelectedSubset) {
        // Important: avoid cart.save() here to prevent VersionError on concurrent cart updates.
        // We persist normalized gifts with updateOne (no optimistic concurrency on this loaded doc).
        Cart.updateOne(
          { _id: cart._id },
          { $set: { selectedGifts: normalizedGifts } }
        ).catch((error) => {
          console.warn('Failed to normalize selected gifts in background:', error);
        });
      }
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
        selectedGifts: responseSelectedGifts,
        subtotal,
        total,
        discount,
        eligibleGiftCampaigns
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
    const identifier = getCartIdentifier(req);
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID required for guest users'
      });
    }

    let cart = await Cart.findOne(identifier);
    if (!cart) {
      cart = new Cart({ ...identifier, items: [] });
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
    const eligibleGiftCampaigns = await computeEligibleGiftCampaigns(cart);
    (cart as any).selectedGifts = sanitizeSelectedGifts((cart as any).selectedGifts || [], eligibleGiftCampaigns);
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

    const identifier = getCartIdentifier(req);
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID required for guest users'
      });
    }

    const cart = await Cart.findOne(identifier);
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
    const eligibleGiftCampaigns = await computeEligibleGiftCampaigns(cart);
    (cart as any).selectedGifts = sanitizeSelectedGifts((cart as any).selectedGifts || [], eligibleGiftCampaigns);
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

    const identifier = getCartIdentifier(req);
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID required for guest users'
      });
    }

    const cart = await Cart.findOne(identifier);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items.pull(itemId);
    await cart.save();
    const eligibleGiftCampaigns = await computeEligibleGiftCampaigns(cart);
    (cart as any).selectedGifts = sanitizeSelectedGifts((cart as any).selectedGifts || [], eligibleGiftCampaigns);
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
    const identifier = getCartIdentifier(req);
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID required for guest users'
      });
    }

    const cart = await Cart.findOne(identifier);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    (cart as any).selectedGifts = [];
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

    const identifier = getCartIdentifier(req);
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID required for guest users'
      });
    }

    const cart = await Cart.findOne(identifier)
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

    // Validate coupon (only for logged-in users)
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Please login to use coupons'
      });
    }

    const canBeUsed = coupon.canBeUsedBy(
      req.user.id,
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
    const identifier = getCartIdentifier(req);
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID required for guest users'
      });
    }

    const cart = await Cart.findOne(identifier);
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

// Select gifts for eligible campaigns
export const selectGifts = async (req: AuthRequest, res: Response) => {
  try {
    const { selections = [] } = req.body;
    const identifier = getCartIdentifier(req);
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Guest ID required for guest users'
      });
    }

    const cart = await Cart.findOne(identifier);
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const eligibleGiftCampaigns = await computeEligibleGiftCampaigns(cart);
    const normalizedSelections = sanitizeSelectedGifts(
      selections.map((item: any) => ({
        campaign: item.campaignId,
        product: item.productId,
        quantity: 1,
        selectedAt: new Date()
      })),
      eligibleGiftCampaigns
    );

    (cart as any).selectedGifts = normalizedSelections;
    await cart.save();

    res.json({
      success: true,
      data: {
        selectedGifts: normalizedSelections,
        eligibleGiftCampaigns
      },
      message: 'Gift selection updated successfully'
    });
  } catch (error) {
    console.error('Error selecting gifts:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
