"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables first before any other imports
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
// Rate limiting completely removed from dependencies
const database_1 = __importDefault(require("./config/database"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const prediction_1 = __importDefault(require("./routes/prediction"));
const admin_1 = __importDefault(require("./routes/admin"));
const staff_1 = __importDefault(require("./routes/staff"));
const check_in_1 = __importDefault(require("./routes/check-in"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const cloudinary_1 = __importDefault(require("./routes/cloudinary"));
const webhook_1 = __importDefault(require("./routes/webhook"));
console.log('🔍 Webhook routes imported:', typeof webhook_1.default, webhook_1.default);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// Trust proxy for rate limiting (needed for Render, Heroku, etc.)
// app.set('trust proxy', 1); // TEMPORARILY DISABLED while debugging
// CORS configuration
const allowedOrigins = [
    'https://predict-frontend-six.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];
// Add environment variable origin if it exists
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}
// Separate CORS for webhooks - this will be applied when webhook routes are registered
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        console.log(`🌐 CORS check for origin: ${origin || 'none'}`);
        // Always allow requests with no origin (webhooks, curl, etc)
        if (!origin) {
            console.log(`✅ Allowing request with no origin`);
            return callback(null, true);
        }
        // Allow all webhook requests (WordPress/WooCommerce)
        if (origin && (origin.includes('wp-admin') || origin.includes('wordpress'))) {
            console.log(`✅ Allowing WordPress origin: ${origin}`);
            return callback(null, true);
        }
        // Remove trailing slash from origin for comparison
        const cleanOrigin = origin.replace(/\/$/, '');
        // Check if the origin is in the allowed list
        const isAllowed = allowedOrigins.some(allowedOrigin => allowedOrigin.replace(/\/$/, '') === cleanOrigin);
        if (isAllowed) {
            console.log(`✅ Allowing known origin: ${origin}`);
            return callback(null, true);
        }
        // For debugging: allow all origins temporarily
        console.log(`⚠️ Unknown origin - allowing anyway for debug: ${origin}`);
        return callback(null, true); // TEMPORARY: Allow all origins
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-WC-Webhook-Signature', 'X-WC-Webhook-Source', 'X-WC-Webhook-Topic', 'X-WC-Webhook-Resource', 'X-WC-Webhook-Event']
}));
// Compression middleware
app.use((0, compression_1.default)());
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Special middleware for webhooks to handle both JSON and form data
app.use('/api/webhook', (req, res, next) => {
    console.log('🔍 Webhook Body Parser:', {
        contentType: req.headers['content-type'],
        bodyType: typeof req.body,
        bodyKeys: Object.keys(req.body || {}),
        rawBody: req.body
    });
    // If it's form data, try to parse it
    if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        console.log('📝 Form data detected, body:', req.body);
    }
    next();
});
// Connect to database
(0, database_1.default)();
// Global debug middleware
app.use('*', (req, res, next) => {
    console.log(`🔍 ${req.method} ${req.path} from ${req.ip} - Origin: ${req.headers.origin || 'none'}`);
    if (req.path.includes('webhook')) {
        console.log(`🎯 WEBHOOK REQUEST DETECTED: ${req.method} ${req.path}`);
        console.log(`📋 Headers:`, req.headers);
    }
    next();
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'PredictWin API is running!',
        timestamp: new Date().toISOString()
    });
});
// TEMPORARY: Direct webhook test endpoint in server.ts
app.all('/api/webhook/direct-test', (req, res) => {
    console.log('🔥 DIRECT WEBHOOK TEST HIT');
    res.json({
        success: true,
        message: 'Direct webhook test working',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path
    });
});
// TEMPORARY: Simple test endpoint without webhook prefix
app.all('/api/simple-test', (req, res) => {
    console.log('🔥 SIMPLE API TEST HIT');
    res.json({
        success: true,
        message: 'Simple API test working',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path
    });
});
// ⚠️ CRITICAL: Webhook routes FIRST with CORS but NO rate limiting
console.log('🔧 Setting up WEBHOOK routes with CORS but NO rate limiting...');
app.use('/api/webhook', (0, cors_1.default)({
    origin: true, // Allow all origins for webhooks
    credentials: false, // No credentials needed for webhooks
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: '*', // Allow all headers for webhooks
    preflightContinue: false,
    optionsSuccessStatus: 200
}), webhook_1.default);
// Rate limiting completely removed from project
console.log('🔧 Setting up API routes WITHOUT rate limiting (permanently removed)...');
// API routes WITHOUT rate limiting (temporarily disabled)
app.use('/api/auth', auth_1.default);
app.use('/api/users', user_1.default);
app.use('/api/predictions', prediction_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/staff', staff_1.default);
app.use('/api/check-in', check_in_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/cloudinary', cloudinary_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});
// Error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📋 API documentation: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
//# sourceMappingURL=server.js.map