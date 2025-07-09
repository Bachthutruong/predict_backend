import { Schema, model, Document, Types } from 'mongoose';

// Interface for a single answer option in a question
export interface ISurveyOption extends Document {
  text: string;
  antiFraudGroupId?: string; // Used for anti-fraud check
}

const SurveyOptionSchema = new Schema<ISurveyOption>({
  text: { type: String, required: true },
  antiFraudGroupId: { type: String },
});

// Interface for a single question in a survey
export interface ISurveyQuestion extends Document {
  text: string;
  type: 'short-text' | 'long-text' | 'single-choice' | 'multiple-choice';
  isRequired: boolean;
  options: ISurveyOption[];
  isAntiFraud: boolean; // Flag for anti-fraud questions
}

const SurveyQuestionSchema = new Schema<ISurveyQuestion>({
  text: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['short-text', 'long-text', 'single-choice', 'multiple-choice'], 
    required: true 
  },
  isRequired: { type: Boolean, default: false },
  options: [SurveyOptionSchema],
  isAntiFraud: { type: Boolean, default: false },
});

// Interface for the Survey document
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

const SurveySchema = new Schema<ISurvey>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'closed'], 
    default: 'draft' 
  },
  pointsAwarded: { type: Number, required: true, default: 0 },
  endDate: { type: Date },
  questions: [SurveyQuestionSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Survey = model<ISurvey>('Survey', SurveySchema);

export default Survey; 