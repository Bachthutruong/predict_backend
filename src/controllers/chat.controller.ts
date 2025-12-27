import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ChatMessage from '../models/ChatMessage';
import User from '../models/user';

// Get chat history for current user (with Admin)
export const getMyChat = async (req: AuthRequest, res: Response) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        // We assume chat is between user and "System" (Admin)
        // So we fetch messages where the user is sender OR receiver
        // And ideally filter where the other party is an admin or generalized

        const messages = await ChatMessage.find({
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
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Send message to Admin (User -> Admin)
export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { content, attachments } = req.body;

        const message = await ChatMessage.create({
            sender: req.user?.id,
            receiver: null, // Broadcast/Support queue
            isAdmin: false,
            content,
            attachments
        });

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// --- Admin Functions ---

// Get all conversations (users who messaged)
export const getConversations = async (req: AuthRequest, res: Response) => {
    try {
        // Find distinct senders where isAdmin is false
        const distinctSenders = await ChatMessage.distinct('sender', { isAdmin: false });

        // Fetch user details
        const users = await User.find({ _id: { $in: distinctSenders } })
            .select('name email avatar')
            .lean();

        // Attach last message for preview
        const conversations = await Promise.all(users.map(async (u) => {
            const lastMsg = await ChatMessage.findOne({
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get chat history with specific user (Admin view)
export const getAdminChatWithUser = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const messages = await ChatMessage.find({
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
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Send message as Admin to User
export const sendAdminMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { content, attachments } = req.body;

        const message = await ChatMessage.create({
            sender: req.user?.id,
            receiver: userId,
            isAdmin: true,
            content,
            attachments
        });

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
