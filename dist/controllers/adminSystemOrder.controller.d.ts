import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const listSystemOrders: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSystemOrderById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createSystemOrder: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSystemOrder: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteSystemOrder: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSystemOrderStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSystemPaymentStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSystemOrderStatistics: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=adminSystemOrder.controller.d.ts.map