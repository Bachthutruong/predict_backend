import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getPointPricePublic: (_req: any, res: Response) => Promise<void>;
export declare const getPointPriceAdmin: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const updatePointPriceAdmin: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const computePointsFromAmount: (amount: number) => Promise<number>;
export declare const getUserMenuConfig: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getGlobalMenuConfigAdmin: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const updateGlobalMenuConfigAdmin: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserMenuConfigAdmin: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateUserMenuConfigAdmin: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=settings.controller.d.ts.map