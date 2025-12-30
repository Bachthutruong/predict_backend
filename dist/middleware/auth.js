"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.staffMiddleware = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = __importDefault(require("../models/user"));
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token, authorization denied' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await user_1.default.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Token is not valid' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Access denied' });
    }
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
};
exports.authorize = authorize;
const staffMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({ success: false, message: 'Staff access required' });
    }
    next();
};
exports.staffMiddleware = staffMiddleware;
// Optional authentication - doesn't fail if no token, but sets user if token is valid
const optionalAuthenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                const user = await user_1.default.findById(decoded.userId).select('-password');
                if (user) {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        isEmailVerified: user.isEmailVerified
                    };
                }
            }
            catch (error) {
                // Invalid token, but continue without user
                console.log('Optional auth: Invalid token, continuing as guest');
            }
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
//# sourceMappingURL=auth.js.map