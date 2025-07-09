import { Document, Types } from 'mongoose';
export interface ISurveyOption extends Document {
    text: string;
    antiFraudGroupId?: string;
}
export interface ISurveyQuestion extends Document {
    text: string;
    type: 'short-text' | 'long-text' | 'single-choice' | 'multiple-choice';
    isRequired: boolean;
    options: ISurveyOption[];
    isAntiFraud: boolean;
}
export interface ISurvey extends Document {
    title: string;
    description: string;
    imageUrl?: string;
    status: 'draft' | 'published' | 'closed';
    pointsAwarded: number;
    endDate?: Date;
    questions: ISurveyQuestion[];
    createdBy: Types.ObjectId;
}
declare const Survey: import("mongoose").Model<ISurvey, {}, {}, {}, Document<unknown, {}, ISurvey, {}> & ISurvey & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Survey;
//# sourceMappingURL=survey.d.ts.map