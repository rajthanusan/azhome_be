// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  address: {
    type: String,
    required: true
  },
  role: { 
    type: String, 
    enum: ['user', 'worker', 'admin'], 
    default: 'user' 
  },
  profilePicture: {
    url: String,
    public_id: String
  },

  service: { 
    type: String,
    enum: [
      // Main Works (Top Priority)
      'plumber',
      'electrician',
      'cleaner',
      'carpenter',
      'painter',
      // Mid-level Common Services
      'flooring',
      'hvac',
      'handyman',
      'appliance repair',
      'appliance installation',
      'landscaping',
      'gardening',
      // Specialized Services
      'marble fitting',
      'tile work',
      'glass fitting',
      'aluminum fitting',
      'roofing',
      'interior design',
      'door installation',
      'window installation',
      'false ceiling',
      'security system installation',
      'pest control',
      'moving service',
      null
    ],
    default: null
  },
  averageRating: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },

  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { 
  timestamps: true 
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('User', userSchema);