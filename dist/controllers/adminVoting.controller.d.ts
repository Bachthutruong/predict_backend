import { Request, Response } from 'express';
export declare const getVotingCampaigns: (req: Request, res: Response) => Promise<void>;
export declare const getVotingCampaign: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createVotingCampaign: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateVotingCampaign: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteVotingCampaign: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addVoteEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateVoteEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteVoteEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getVotingStatistics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=adminVoting.controller.d.ts.map