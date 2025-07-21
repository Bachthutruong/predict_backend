import { Request, Response } from 'express';
export declare const createContest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getContests: (req: Request, res: Response) => Promise<void>;
export declare const getContestById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateContest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteContest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const publishAnswer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getContestSubmissions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getContestStatistics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=adminContest.controller.d.ts.map