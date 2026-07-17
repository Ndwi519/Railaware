import mongoose from 'mongoose';

const EmergencyContactSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  relationship: { type: String },
  notifyOnHighRisk: { type: Boolean, default: true },
}, { timestamps: true });

export const EmergencyContact = mongoose.model('EmergencyContact', EmergencyContactSchema);
