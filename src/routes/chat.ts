import express from 'express';
import { authenticate } from '../middleware/auth';
import { getMyChat, sendMessage, getConversations, getAdminChatWithUser, sendAdminMessage } from '../controllers/chat.controller';

const router = express.Router();

router.get('/', authenticate, getMyChat);
router.post('/', authenticate, sendMessage);

// Admin Routes
router.get('/conversations', authenticate, getConversations);
router.get('/user/:userId', authenticate, getAdminChatWithUser);
router.post('/user/:userId', authenticate, sendAdminMessage);

export default router;
