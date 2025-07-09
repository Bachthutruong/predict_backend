import { Document, Types } from 'mongoose';
export interface ISurveyAnswer {
    questionId: Types.ObjectId;
    questionText: string;
    questionType: string;
    answer: string[];
    otherText?: string;
}
export interface ISurveySubmission extends Document {
    surveyId: Types.ObjectId;
    userId: Types.ObjectId;
    answers: ISurveyAnswer[];
    isFraudulent: boolean;
    fraudReason?: string;
    submittedAt: Date;
}
declare const SurveySubmission: import("mongoose").Model<ISurveySubmission, {}, {}, {}, Document<unknown, {}, ISurveySubmission, {}> & ISurveySubmission & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default SurveySubmission;
//# sourceMappingURL=survey-submission.d.ts.map