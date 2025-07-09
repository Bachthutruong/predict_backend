import { Request, Response } from 'express';
export declare const getPublishedSurveys: (req: Request, res: Response) => Promise<void>;
export declare const getSurveyToFill: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const submitSurvey: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=userSurvey.controller.d.ts.map