const Booking = require('../models/Booking');
const User = require('../models/User');
const Availability = require('../models/Availability');
const nodemailer = require('nodemailer');


// Create reusable transporter object using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME || 'rajthanusan08@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'mumfvummfkwbqsyu',
  },
});

// Function to send booking status notification
async function sendBookingNotification(bookingId, action, reason = '') {
  try {
    // Fetch booking details with user and worker information
    const booking = await Booking.findById(bookingId)
      .populate('user', 'fullName email')
      .populate('worker', 'fullName email phone service');
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    let subject, html;
    
    // Customize email based on action
    switch(action) {
      case 'accepted':
        subject = `Your ${booking.service} booking has been accepted`;
        html = `
          <p>Dear ${booking.user.fullName},</p>
          <p>Great news! Your booking request for <strong>${booking.service}</strong> has been accepted by <strong>${booking.worker.fullName}</strong>.</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li>Date: ${new Date(booking.date).toLocaleDateString()}</li>
            <li>Time: ${booking.startTime} - ${booking.endTime}</li>
            <li>Worker: ${booking.worker.fullName}</li>
            <li>Service: ${booking.service}</li>
            <li>Address: ${booking.address}</li>
          </ul>
          <p>Please be prepared for the service at the scheduled time. You can contact your service professional at ${booking.worker.phone} if needed.</p>
          <p>Thank you for choosing AZHome!</p>
          <p>Best regards,<br><strong>The AZHome Team</strong></p>
        `;
        break;
        
      case 'rejected':
        subject = `Update on your ${booking.service} booking request`;
        html = `
          <p>Dear ${booking.user.fullName},</p>
          <p>We regret to inform you that your booking request for <strong>${booking.service}</strong> on ${new Date(booking.date).toLocaleDateString()} has been declined by the service professional.</p>
          <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
          <p>We apologize for any inconvenience this may cause. Please log in to your AZHome account to book another available time slot or choose a different service professional.</p>
          <p>If you need assistance, our support team is available to help you find the right professional for your needs.</p>
          <p>Thank you for your understanding.</p>
          <p>Best regards,<br><strong>The AZHome Team</strong></p>
        `;
        break;
        
      case 'completed':
        subject = `Your ${booking.service} service has been completed`;
        html = `
          <p>Dear ${booking.user.fullName},</p>
          <p>Your <strong>${booking.service}</strong> service has been successfully completed by <strong>${booking.worker.fullName}</strong>.</p>
          <p>We hope you are satisfied with the service provided. Please consider leaving a review for your service professional to help us maintain quality standards.</p>
          <p>If you have any feedback or concerns about the service, please don't hesitate to contact our support team.</p>
          <p>Thank you for choosing AZHome for your home service needs!</p>
          <p>Best regards,<br><strong>The AZHome Team</strong></p>
        `;
        break;
        
      default:
        throw new Error('Invalid notification action');
    }
    
    // Setup email data
    const mailOptions = {
      from: `"AZHome Team" <${process.env.EMAIL_USERNAME || 'rajthanusan08@gmail.com'}>`,
      to: booking.user.email,
      subject: subject,
      html: html
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${booking.user.email} for booking ${action}`);
    
    return { success: true, message: `Notification sent successfully for ${action} action` };
  } catch (error) {
    console.error('Error sending notification email:', error);
    throw new Error(`Failed to send notification: ${error.message}`);
  }
}



exports.createBooking = async (req, res) => {
  try {
    const { workerId, availabilityId, service, address, notes } = req.body;
    
    
    if (!workerId || !availabilityId || !service || !address) {
      return res.status(400).json({
        status: 'error',
        message: 'Worker ID, availability ID, service, and address are required'
      });
    }

    
    const worker = await User.findOne({ 
      _id: workerId, 
      role: 'worker',
      service: service 
    });
    
    if (!worker) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found or does not provide this service'
      });
    }

    
    const availability = await Availability.findById(availabilityId);
    if (!availability) {
      return res.status(404).json({
        status: 'error',
        message: 'Time slot not available'
      });
    }

    // Check slot availability
    if (availability.isBooked) {
      return res.status(400).json({
        status: 'error',
        message: 'This time slot is already booked'
      });
    }

    // Verify the slot belongs to the requested worker
    if (availability.worker.toString() !== workerId) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid time slot for this worker'
      });
    }

    // Create the booking
    const booking = await Booking.create({
      user: req.user.id,
      worker: workerId,
      service,
      address,
      notes,
      date: availability.date,
      startTime: availability.startTime,
      endTime: availability.endTime,
      status: 'pending',
      availability: availabilityId
    });

    // Mark the availability as booked
    availability.isBooked = true;
    availability.bookedBy = req.user.id;
    await availability.save();

    res.status(201).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get all bookings for the current user
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('worker', 'fullName email phone service')
      .sort({ date: -1, startTime: -1 });
    
    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: {
        bookings
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get a single booking details
exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user.id },
        { worker: req.user.id }
      ]
    })
    .populate('user', 'fullName email phone')
    .populate('worker', 'fullName email phone service');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or unauthorized access'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Get bookings for the current worker
exports.getWorkerBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { worker: req.user.id };
    
    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'fullName email phone address')
      .sort({ date: 1, startTime: 1 });
    
    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: {
        bookings
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Worker accepts a booking
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { 
        _id: req.params.id, 
        worker: req.user.id, 
        status: 'pending' 
      },
      { status: 'confirmed' },
      { new: true, runValidators: true }
    ).populate('user', 'fullName email phone');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or already processed'
      });
    }

    // Send acceptance notification
    try {
      await sendBookingNotification(booking._id, 'accepted');
    } catch (emailError) {
      console.error('Failed to send acceptance email:', emailError);
      // Continue even if email fails - don't fail the whole request
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};
exports.rejectBooking = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const booking = await Booking.findOneAndUpdate(
      { 
        _id: req.params.id, 
        worker: req.user.id, 
        status: 'pending' 
      },
      { 
        status: 'rejected',
        rejectionReason: reason || 'No reason provided' 
      },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or already processed'
      });
    }

    // Free up the availability slot
    await Availability.findByIdAndUpdate(
      booking.availability,
      { 
        isBooked: false,
        bookedBy: null 
      }
    );

    // Send rejection notification
    try {
      await sendBookingNotification(booking._id, 'rejected', reason);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Continue even if email fails
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// Worker marks booking as completed (updated to include notification)
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { 
        _id: req.params.id, 
        worker: req.user.id, 
        status: 'confirmed' 
      },
      { 
        status: 'completed',
        completionNotes: req.body.notes || '' 
      },
      { new: true, runValidators: true }
    ).populate('user', 'fullName email phone');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or cannot be completed'
      });
    }

    // Send completion notification
    try {
      await sendBookingNotification(booking._id, 'completed');
    } catch (emailError) {
      console.error('Failed to send completion email:', emailError);
      // Continue even if email fails
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

// User cancels a booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { 
        _id: req.params.id, 
        user: req.user.id, 
        status: { $in: ['pending', 'confirmed'] } 
      },
      { 
        status: 'cancelled',
        cancellationReason: req.body.reason || 'No reason provided' 
      },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or cannot be cancelled'
      });
    }

    // Free up the availability slot if booking was confirmed
    if (booking.status === 'confirmed') {
      await Availability.findByIdAndUpdate(
        booking.availability,
        { 
          isBooked: false,
          bookedBy: null 
        }
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};
async function sendBookingConfirmation(bookingId) {
  try {
    const booking = await Booking.findById(bookingId)
      .populate('user', 'fullName email')
      .populate('worker', 'fullName service');
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    const mailOptions = {
      from: `"AZHome Team" <${process.env.EMAIL_USERNAME || 'rajthanusan08@gmail.com'}>`,
      to: booking.user.email,
      subject: `Your ${booking.service} booking is pending confirmation`,
      html: `
        <p>Dear ${booking.user.fullName},</p>
        <p>Thank you for booking with AZHome! Your request for <strong>${booking.service}</strong> has been received and is pending confirmation from the service professional.</p>
        <p><strong>Booking Details:</strong></p>
        <ul>
          <li>Date: ${new Date(booking.date).toLocaleDateString()}</li>
          <li>Time: ${booking.startTime} - ${booking.endTime}</li>
          <li>Requested Professional: ${booking.worker.fullName}</li>
          <li>Service: ${booking.service}</li>
          <li>Address: ${booking.address}</li>
        </ul>
        <p>You will receive another email once the service professional confirms your booking. If the professional is unable to accept your booking, you'll be notified and can choose another available time slot.</p>
        <p>Thank you for choosing AZHome!</p>
        <p>Best regards,<br><strong>The AZHome Team</strong></p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation email sent to ${booking.user.email}`);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
  }
}

// Admin gets all bookings (filterable)
exports.getAllBookings = async (req, res) => {
  try {
    const { status, worker, user, service, from, to } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (worker) filter.worker = worker;
    if (user) filter.user = user;
    if (service) filter.service = service;
    
    if (from && to) {
      filter.date = {
        $gte: new Date(from),
        $lte: new Date(to)
      };
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'fullName email phone')
      .populate('worker', 'fullName email phone service')
      .sort({ date: -1, startTime: -1 });
    
    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: {
        bookings
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};