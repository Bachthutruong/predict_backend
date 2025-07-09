import { Request, Response } from 'express';
export declare const createSurvey: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSurveys: (req: Request, res: Response) => Promise<void>;
export declare const getSurveyById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSurvey: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteSurvey: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSurveySubmissions: (req: Request, res: Response) => Promise<void>;
export declare const exportSubmissionsToExcel: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=adminSurvey.controller.d.ts.map