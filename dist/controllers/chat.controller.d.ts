import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getMyChat: (req: AuthRequest, res: Response) => Promise<void>;
export declare const sendMessage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getConversations: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAdminChatWithUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const sendAdminMessage: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=chat.controller.d.ts.map