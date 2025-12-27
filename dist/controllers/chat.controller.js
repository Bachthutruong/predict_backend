"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAdminMessage = exports.getAdminChatWithUser = exports.getConversations = exports.sendMessage = exports.getMyChat = void 0;
const ChatMessage_1 = __importDefault(require("../models/ChatMessage"));
const user_1 = __importDefault(require("../models/user"));
// Get chat history for current user (with Admin)
const getMyChat = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        // We assume chat is between user and "System" (Admin)
        // So we fetch messages where the user is sender OR receiver
        // And ideally filter where the other party is an admin or generalized
        const messages = await ChatMessage_1.default.find({
            $or: [
                { sender: req.user?.id },
                { receiver: req.user?.id }
            ]
        })
            .sort({ createdAt: -1 }) // Newest first
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        // Reverse to chronological order for UI
        const sorted = messages.reverse();
        res.json({ success: true, data: sorted });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getMyChat = getMyChat;
// Send message to Admin (User -> Admin)
const sendMessage = async (req, res) => {
    try {
        const { content, attachments } = req.body;
        const message = await ChatMessage_1.default.create({
            sender: req.user?.id,
            receiver: null, // Broadcast/Support queue
            isAdmin: false,
            content,
            attachments
        });
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.sendMessage = sendMessage;
// --- Admin Functions ---
// Get all conversations (users who messaged)
const getConversations = async (req, res) => {
    try {
        // Find distinct senders where isAdmin is false
        const distinctSenders = await ChatMessage_1.default.distinct('sender', { isAdmin: false });
        // Fetch user details
        const users = await user_1.default.find({ _id: { $in: distinctSenders } })
            .select('name email avatar')
            .lean();
        // Attach last message for preview
        const conversations = await Promise.all(users.map(async (u) => {
            const lastMsg = await ChatMessage_1.default.findOne({
                $or: [
                    { sender: u._id },
                    { receiver: u._id }
                ]
            }).sort({ createdAt: -1 });
            return {
                ...u,
                lastMessage: lastMsg ? {
                    content: lastMsg.content,
                    createdAt: lastMsg.createdAt,
                    read: lastMsg.read,
                    isAdmin: lastMsg.isAdmin
                } : null
            };
        }));
        // Sort by last message time
        conversations.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });
        res.json({ success: true, data: conversations });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getConversations = getConversations;
// Get chat history with specific user (Admin view)
const getAdminChatWithUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const messages = await ChatMessage_1.default.find({
            $or: [
                { sender: userId, receiver: null }, // User sent to system
                { sender: userId, isAdmin: false }, // Broad check
                { receiver: userId } // Admin sent to user
            ]
        })
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        res.json({ success: true, data: messages.reverse() });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.getAdminChatWithUser = getAdminChatWithUser;
// Send message as Admin to User
const sendAdminMessage = async (req, res) => {
    try {
        const { userId } = req.params;
        const { content, attachments } = req.body;
        const message = await ChatMessage_1.default.create({
            sender: req.user?.id,
            receiver: userId,
            isAdmin: true,
            content,
            attachments
        });
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.sendAdminMessage = sendAdminMessage;
//# sourceMappingURL=chat.controller.js.map