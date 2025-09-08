const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: String,
    required: true,
    enum: [
      'plumber',
      'electrician',
      'cleaner',
      'carpenter',
      'painter',
      'flooring',
      'hvac',
      'handyman',
      'appliance repair',
      'appliance installation',
      'landscaping',
      'gardening',
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
      'moving service'
    ]
  },
  address: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  completionNotes: {
    type: String,
    maxlength: 500
  },
  availability: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Availability',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: 1000
  }
}, { 
  timestamps: true 
});

// Indexes for faster queries
bookingSchema.index({ user: 1 });
bookingSchema.index({ worker: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ date: 1 });
bookingSchema.index({ service: 1 });

module.exports = mongoose.model('Booking', bookingSchema);