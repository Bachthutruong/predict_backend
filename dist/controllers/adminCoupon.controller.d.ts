import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getAllCoupons: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCouponById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createCoupon: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCoupon: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCoupon: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleCouponStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const validateCoupon: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCouponStatistics: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=adminCoupon.controller.d.ts.map