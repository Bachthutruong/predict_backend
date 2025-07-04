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

// Initialize default settings
SystemSettings.find({}).then(settings => {
  if (settings.length === 0) {
    const defaultSettings = [
      { settingKey: 'checkInPoints', settingValue: 10, description: 'Points awarded for daily check-in' },
      { settingKey: 'streakBonusPoints', settingValue: 50, description: 'Bonus points for 7-day check-in streak' },
      { settingKey: 'referralPoints', settingValue: 100, description: 'Points for successful referral' },
      { settingKey: 'milestone10Points', settingValue: 500, description: 'Bonus points for every 10 successful referrals' },
    ];
    SystemSettings.insertMany(defaultSettings);
  }
});

export default SystemSettings; 