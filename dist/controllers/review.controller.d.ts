import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getProductReviews: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createReview: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=review.controller.d.ts.map