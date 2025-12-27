import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getShopProducts: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getShopProductById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProductCategories: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getFeaturedProducts: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSuggestionPackages: (req: AuthRequest, res: Response) => Promise<void>;
export declare const validateCoupon: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const searchProducts: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getBranches: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPaymentConfig: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=shop.controller.d.ts.map