"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vuduybachvp:TJ4obGsJleYENZzV@livechat.jcxnz9h.mongodb.net/predict_win';
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
}
let cached = globalThis.mongooseGlobal;
if (!cached) {
    cached = globalThis.mongooseGlobal = { conn: null, promise: null };
}
async function dbConnect() {
    if (!cached) {
        cached = globalThis.mongooseGlobal = { conn: null, promise: null };
    }
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            // Connection pooling for better performance
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 5, // Maintain a minimum of 5 socket connections
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            // Database-level options
            retryWrites: true,
            w: 'majority',
            // Performance optimizations
            compressors: ['zlib'], // Enable compression
        };
        cached.promise = mongoose_1.default.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('✅ Connected to MongoDB with optimized settings');
            return mongoose;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (e) {
        if (cached) {
            cached.promise = null;
        }
        throw e;
    }
    return cached.conn;
}
exports.default = dbConnect;
//# sourceMappingURL=database.js.map