import { Request, Response } from 'express';
export declare const getActiveVotingCampaigns: (req: Request, res: Response) => Promise<void>;
export declare const getVotingCampaignDetail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const voteForEntry: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const removeVote: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUserVotingHistory: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=userVoting.controller.d.ts.map