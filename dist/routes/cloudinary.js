"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cloudinary_1 = require("cloudinary");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dycxmy3tq',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Generate signature for signed upload
router.post('/signature', auth_1.authMiddleware, async (req, res) => {
    try {
        const { timestamp, folder = 'predict-win' } = req.body;
        // Parameters for upload
        const params = {
            timestamp: timestamp || Math.round(new Date().getTime() / 1000),
            folder,
            use_filename: true,
            unique_filename: false,
        };
        // Generate signature
        const signature = cloudinary_1.v2.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
        res.json({
            success: true,
            data: {
                signature,
                timestamp: params.timestamp,
                cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dycxmy3tq',
                apiKey: process.env.CLOUDINARY_API_KEY,
                folder: params.folder,
            }
        });
    }
    catch (error) {
        console.error('Signature generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate signature'
        });
    }
});
exports.default = router;
//# sourceMappingURL=cloudinary.js.map