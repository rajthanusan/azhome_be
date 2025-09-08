const Booking = require('../models/Booking');
const User = require('../models/User');
const Availability = require('../models/Availability');


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

// Worker rejects a booking
exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { 
        _id: req.params.id, 
        worker: req.user.id, 
        status: 'pending' 
      },
      { 
        status: 'rejected',
        rejectionReason: req.body.reason || 'No reason provided' 
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

// Worker marks booking as completed
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