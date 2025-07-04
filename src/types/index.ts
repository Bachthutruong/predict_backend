export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'user';
  points: number;
  avatarUrl: string;
  checkInStreak?: number;
  lastCheckIn?: string;
  isEmailVerified: boolean;
  referralCode?: string;
  referredBy?: string;
  consecutiveCheckIns: number;
  lastCheckInDate?: string;
  totalSuccessfulReferrals: number;
  createdAt: string;
};

export type Prediction = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  'data-ai-hint'?: string;
  answer: string;
  pointsCost: number;
  status: 'active' | 'finished';
  authorId: string;
  createdAt: string;
  winnerId?: string | {
    id: string;
    name: string;
    avatarUrl: string;
  };
};

export type UserPrediction = {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  predictionId: string;
  guess: string;
  isCorrect: boolean;
  pointsSpent: number;
  createdAt: string;
};

export type Feedback = {
  id: string;
  userId: string;
  user: User;
  feedbackText: string;
  status: 'pending' | 'approved' | 'rejected';
  awardedPoints?: number;
  createdAt: string;
};

export type PointTransaction = {
  id: string;
  userId: string;
  user: { name: string };
  adminId?: string;
  admin?: { name: string };
  amount: number;
  reason:
    | 'check-in'
    | 'referral'
    | 'feedback'
    | 'prediction-win'
    | 'admin-grant'
    | 'streak-bonus';
  createdAt: string;
  notes?: string;
};

export type Question = {
  id: string;
  questionText: string;
  imageUrl?: string;
  answer: string;
  isPriority: boolean;
  status: 'active' | 'inactive';
  displayCount: number;
  correctAnswerCount: number;
  points: number;
  createdAt: string;
};

export type Referral = {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUser: { name: string; createdAt: string; consecutiveCheckIns: number };
  status: 'pending' | 'completed'; // completed after 3 days check-in
  createdAt: string;
};

export type CheckIn = {
  id: string;
  userId: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  pointsEarned: number;
  checkInDate: string;
  createdAt: string;
};

export type SystemSettings = {
  id: string;
  settingKey: string;
  settingValue: number;
  description: string;
};

// Auth related types
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'user';
  isEmailVerified: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
  referralCode?: string;
};

// Request types
export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Response types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}; 