import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getAllSuggestionPackages: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSuggestionPackageById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createSuggestionPackage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateSuggestionPackage: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteSuggestionPackage: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleSuggestionPackageStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSortOrder: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSuggestionPackageStatistics: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=adminSuggestionPackage.controller.d.ts.map