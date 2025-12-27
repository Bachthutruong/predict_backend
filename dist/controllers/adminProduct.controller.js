"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryHistory = exports.updateProductStock = exports.getProductCategories = exports.toggleProductStatus = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const InventoryLog_1 = __importDefault(require("../models/InventoryLog"));
// Get all products with pagination and filters
const getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category = '', isActive = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const query = {};
        if (search) {
            const searchStr = String(search);
            query.$or = [
                { name: { $regex: searchStr, $options: 'i' } },
                { description: { $regex: searchStr, $options: 'i' } },
                { tags: { $in: [new RegExp(searchStr, 'i')] } }
            ];
        }
        if (category) {
            query.category = category;
        }
        if (isActive !== '') {
            query.isActive = isActive === 'true';
        }
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const products = await Product_1.default.find(query)
            .populate('createdBy', 'name email')
            .sort(sortOptions)
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));
        const total = await Product_1.default.countDocuments(query);
        res.json({
            success: true,
            data: products,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAllProducts = getAllProducts;
// Get single product
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findById(id).populate('createdBy', 'name email');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: product });
    }
    catch (error) {
        console.error('Error getting product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getProductById = getProductById;
// Create new product
const createProduct = async (req, res) => {
    try {
        const { name, description, price, originalPrice, images = [], category, brand, sku, stock, isActive = true, isFeatured = false, weight, dimensions, pointsReward = 0, pointsRequired = 0, canPurchaseWithPoints = false, metaTitle, metaDescription, tags = [], variants = [], freeShipping = false, shippingWeight = 0 } = req.body;
        const product = new Product_1.default({
            name,
            description,
            price,
            originalPrice,
            images: images,
            category,
            brand,
            sku,
            stock,
            isActive,
            isFeatured,
            weight,
            dimensions,
            pointsReward,
            pointsRequired,
            canPurchaseWithPoints,
            metaTitle,
            metaDescription,
            tags,
            variants,
            freeShipping,
            shippingWeight,
            createdBy: req.user?.id
        });
        await product.save();
        res.status(201).json({ success: true, data: product });
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.createProduct = createProduct;
// Update product
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        // Only allow updating safe, whitelisted fields
        const allowedFields = [
            'name',
            'description',
            'price',
            'originalPrice',
            'images',
            'category',
            'brand',
            'sku',
            'stock',
            'isActive',
            'isFeatured',
            'weight',
            'dimensions',
            'pointsReward',
            'pointsRequired',
            'canPurchaseWithPoints',
            'metaTitle',
            'metaDescription',
            'tags',
            'variants',
            'freeShipping',
            'shippingWeight'
        ];
        const updateData = {};
        for (const key of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                updateData[key] = req.body[key];
            }
        }
        // Explicitly block fields that should never be overwritten from client payload
        delete updateData._id;
        delete updateData.id;
        delete updateData.createdBy;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        const product = await Product_1.default.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('createdBy', 'name email');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: product });
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateProduct = updateProduct;
// Delete product
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findByIdAndDelete(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.deleteProduct = deleteProduct;
// Toggle product status
const toggleProductStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product_1.default.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.isActive = !product.isActive;
        await product.save();
        res.json({
            success: true,
            data: product,
            message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Error toggling product status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.toggleProductStatus = toggleProductStatus;
// Get product categories
const getProductCategories = async (req, res) => {
    try {
        const categories = await Product_1.default.distinct('category', { isActive: true });
        res.json({ success: true, data: categories });
    }
    catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getProductCategories = getProductCategories;
// Update product stock
const updateProductStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { stock, operation = 'set', reason = '', note = '' } = req.body; // operation: 'set', 'add', 'subtract'
        const product = await Product_1.default.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const previousStock = product.stock;
        let changeAmount = 0;
        switch (operation) {
            case 'add':
                product.stock += stock;
                changeAmount = stock;
                break;
            case 'subtract':
                changeAmount = -stock;
                product.stock = Math.max(0, product.stock - stock);
                break;
            case 'set':
            default:
                changeAmount = stock - previousStock;
                product.stock = stock;
                break;
        }
        await product.save();
        // Log inventory change
        try {
            if (changeAmount !== 0) {
                await InventoryLog_1.default.create({
                    product: product._id,
                    changeAmount,
                    previousStock,
                    newStock: product.stock,
                    type: operation === 'add' ? 'import' : (operation === 'subtract' ? 'export' : 'adjustment'),
                    reason: reason || 'Manual update',
                    note,
                    performedBy: req.user?.id
                });
            }
        }
        catch (logError) {
            console.error('Failed to log inventory change:', logError);
        }
        res.json({
            success: true,
            data: product,
            message: 'Stock updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.updateProductStock = updateProductStock;
// Get product inventory history
const getInventoryHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const history = await InventoryLog_1.default.find({ product: id })
            .populate('performedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await InventoryLog_1.default.countDocuments({ product: id });
        res.json({
            success: true,
            data: history,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        console.error('Error getting inventory history:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getInventoryHistory = getInventoryHistory;
//# sourceMappingURL=adminProduct.controller.js.map