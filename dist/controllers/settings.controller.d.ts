import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getPointPricePublic: (_req: any, res: Response) => Promise<void>;
export declare const getPointPriceAdmin: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const updatePointPriceAdmin: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const computePointsFromAmount: (amount: number) => Promise<number>;
//# sourceMappingURL=settings.controller.d.ts.map