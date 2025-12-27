import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getProductReviews: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createReview: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllReviews: (req: AuthRequest, res: Response) => Promise<void>;
export declare const replyReview: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleAdminReaction: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteReview: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateReviewConfig: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getReviewConfig: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=review.controller.d.ts.map