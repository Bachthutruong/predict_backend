import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const listBranches: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getBranchById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createBranch: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateBranch: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteBranch: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=adminBranch.controller.d.ts.map