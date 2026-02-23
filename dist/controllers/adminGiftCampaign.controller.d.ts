import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getGiftCampaigns: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getGiftCampaignById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createGiftCampaign: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateGiftCampaign: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteGiftCampaign: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=adminGiftCampaign.controller.d.ts.map