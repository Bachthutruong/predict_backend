import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getNewsList: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getNewsBySlug: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getManageNewsList: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getManageNewsById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createNews: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateNews: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteNews: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=news.controller.d.ts.map