"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Cart_1 = __importDefault(require("../models/Cart"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mergeDuplicateCartItems = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/predict-win');
        console.log('Connected to MongoDB');
        const carts = await Cart_1.default.find({});
        console.log(`Found ${carts.length} carts to process`);
        let updatedCount = 0;
        for (const cart of carts) {
            const mergedItems = [];
            const processedProducts = new Set();
            for (const item of cart.items) {
                const productId = item.product.toString();
                const itemVariant = item.variant && Object.keys(item.variant).length > 0 ? item.variant : null;
                const key = `${productId}-${JSON.stringify(itemVariant)}`;
                if (processedProducts.has(key)) {
                    // Find and update existing item
                    const existingItem = mergedItems.find(mi => {
                        const miProductId = mi.product.toString();
                        const miVariant = mi.variant && Object.keys(mi.variant).length > 0 ? mi.variant : null;
                        const miKey = `${miProductId}-${JSON.stringify(miVariant)}`;
                        return miKey === key;
                    });
                    if (existingItem) {
                        existingItem.quantity += item.quantity;
                    }
                }
                else {
                    processedProducts.add(key);
                    mergedItems.push({
                        product: item.product,
                        quantity: item.quantity,
                        price: item.price,
                        variant: itemVariant,
                        addedAt: item.addedAt
                    });
                }
            }
            // Only update if there were duplicates
            if (mergedItems.length < cart.items.length) {
                cart.items = mergedItems;
                await cart.save();
                updatedCount++;
                console.log(`Merged duplicates in cart for user ${cart.user}`);
            }
        }
        console.log(`\nMigration complete! Updated ${updatedCount} carts.`);
        process.exit(0);
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};
mergeDuplicateCartItems();
//# sourceMappingURL=mergeDuplicateCartItems.js.map