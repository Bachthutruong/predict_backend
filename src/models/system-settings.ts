import mongoose, { Schema, models, model } from 'mongoose';

const SystemSettingsSchema = new Schema({
  settingKey: { type: String, required: true, unique: true },
  settingValue: { type: Number, required: true },
  description: { type: String, required: true },
}, { timestamps: true });

SystemSettingsSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const SystemSettings = models?.SystemSettings || model('SystemSettings', SystemSettingsSchema);

export const initializeDefaultSystemSettings = async () => {
  try {
    const count = await SystemSettings.countDocuments({});
    if (count === 0) {
      const defaultSettings = [
        { settingKey: 'checkInPoints', settingValue: 10, description: 'Points awarded for daily check-in' },
        { settingKey: 'streakBonusPoints', settingValue: 50, description: 'Bonus points for 7-day check-in streak' },
        { settingKey: 'referralPoints', settingValue: 100, description: 'Points for successful referral' },
        { settingKey: 'milestone10Points', settingValue: 500, description: 'Bonus points for every 10 successful referrals' },
        { settingKey: 'reviewPoints', settingValue: 50, description: 'Points awarded for submitting a product review' },
        { settingKey: 'pointPrice', settingValue: 1, description: 'Currency per 1 point' },
      ];
      await SystemSettings.insertMany(defaultSettings);
    } else {
      // Ensure pointPrice and reviewPoints exist
      await SystemSettings.updateOne(
        { settingKey: 'pointPrice' },
        { $setOnInsert: { settingKey: 'pointPrice', settingValue: 1, description: 'Currency per 1 point' } },
        { upsert: true }
      );
      await SystemSettings.updateOne(
        { settingKey: 'reviewPoints' },
        { $setOnInsert: { settingKey: 'reviewPoints', settingValue: 50, description: 'Points awarded for submitting a product review' } },
        { upsert: true }
      );
    }
  } catch (e) {
    console.error('initializeDefaultSystemSettings error:', e);
  }
};

export default SystemSettings;