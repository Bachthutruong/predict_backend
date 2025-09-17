import { Response, NextFunction } from 'express';
/**
 * Middleware to check if the current user is the author of a prediction
 * This ensures only the prediction author can view/edit the answer
 */
export declare const checkPredictionAuthor: (req: any, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Middleware to check if the current user can view prediction details
 * Authors can see decrypted answers, others see encrypted answers
 */
export declare const checkPredictionViewAccess: (req: any, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=predictionAuth.d.ts.map