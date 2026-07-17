import mongoose from 'mongoose';

const UserSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  noiseThresholdMetres: { type: Number, default: 10 },
  highContrastMode: { type: Boolean, default: false },
  notificationsEnabled: { type: Boolean, default: true },
  shareLocationWithContacts: { type: Boolean, default: false },
}, { timestamps: true });

export const UserSettings = mongoose.model('UserSettings', UserSettingsSchema);
