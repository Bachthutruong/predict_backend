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
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const database_1 = __importDefault(require("@/config/database"));
// Import routes
const auth_1 = __importDefault(require("@/routes/auth"));
const user_1 = __importDefault(require("@/routes/user"));
const prediction_1 = __importDefault(require("@/routes/prediction"));
const admin_1 = __importDefault(require("@/routes/admin"));
const staff_1 = __importDefault(require("@/routes/staff"));
const check_in_1 = __importDefault(require("@/routes/check-in"));
const feedback_1 = __importDefault(require("@/routes/feedback"));
const dashboard_1 = __importDefault(require("@/routes/dashboard"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Compression middleware
app.use((0, compression_1.default)());
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Connect to database
(0, database_1.default)();
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'PredictWin API is running!',
        timestamp: new Date().toISOString()
    });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', user_1.default);
app.use('/api/predictions', prediction_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/staff', staff_1.default);
app.use('/api/check-in', check_in_1.default);
app.use('/api/feedback', feedback_1.default);
app.use('/api/dashboard', dashboard_1.default);
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