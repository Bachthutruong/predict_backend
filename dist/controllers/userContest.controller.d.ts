import { Request, Response } from 'express';
export declare const getActiveContests: (req: Request, res: Response) => Promise<void>;
export declare const getContestDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const submitContestAnswer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getContestHistory: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=userContest.controller.d.ts.map