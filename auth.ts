import mongoose from 'mongoose';

const healthInfoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  weight: {
    type: Number,
    required: true
  },
  medicalHistory: [{
    type: String
  }],
  currentMedications: [{
    name: String,
    dosage: String
  }],
  rehabilitationNeeds: {
    type: [String],
    enum: ['术后恢复', '慢性病管理', '运动康复', '老年保健', '其他'],
    required: true
  },
  otherNeeds: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const HealthInfo = mongoose.models.HealthInfo || mongoose.model('HealthInfo', healthInfoSchema); 