import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dycxmy3tq',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Generate signature for signed upload
router.post('/signature', authMiddleware, async (req, res) => {
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
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);

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
  } catch (error) {
    console.error('Signature generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate signature'
    });
  }
});

export default router; 