import { Schema, model, Document, Types } from 'mongoose';

// Interface for a single answer in a submission
export interface ISurveyAnswer {
  questionId: Types.ObjectId;
  questionText: string;
  questionType: string;
  answer: string[]; // For text types, array with one element. For choice types, array of selected option texts.
  otherText?: string; // For 'other' option in multiple-choice
}

const SurveyAnswerSchema = new Schema<ISurveyAnswer>({
  questionId: { type: Schema.Types.ObjectId, required: true },
  questionText: { type: String, required: true },
  questionType: { type: String, required: true },
  answer: [{ type: String }],
  otherText: { type: String },
}, { _id: false });

// Interface for the SurveySubmission document
export interface ISurveySubmission extends Document {
  surveyId: Types.ObjectId;
  userId: Types.ObjectId;
  answers: ISurveyAnswer[];
  isFraudulent: boolean;
  fraudReason?: string;
  submittedAt: Date;
}

const SurveySubmissionSchema = new Schema<ISurveySubmission>({
  surveyId: { type: Schema.Types.ObjectId, ref: 'Survey', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [SurveyAnswerSchema],
  isFraudulent: { type: Boolean, default: false },
  fraudReason: { type: String },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const SurveySubmission = model<ISurveySubmission>('SurveySubmission', SurveySubmissionSchema);

export default SurveySubmission; 