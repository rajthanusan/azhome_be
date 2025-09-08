const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middleware/auth');

// User routes
router.post('/', 
  authenticate, 
  authorize(['user']), 
  bookingController.createBooking
);

router.get('/user', 
  authenticate, 
  authorize(['user']), 
  bookingController.getUserBookings
);

router.get('/:id', 
  authenticate, 
  bookingController.getBookingDetails
);

router.patch('/:id/cancel', 
  authenticate, 
  authorize(['user']), 
  bookingController.cancelBooking
);

// Worker routes
router.get('/worker/list', 
  authenticate, 
  authorize(['worker']), 
  bookingController.getWorkerBookings
);

router.patch('/:id/accept', 
  authenticate, 
  authorize(['worker']), 
  bookingController.acceptBooking
);

router.patch('/:id/reject', 
  authenticate, 
  authorize(['worker']), 
  bookingController.rejectBooking
);

router.patch('/:id/complete', 
  authenticate, 
  authorize(['worker']), 
  bookingController.completeBooking
);

// Admin routes
router.get('/admin/all', 
  authenticate, 
  authorize(['admin']), 
  bookingController.getAllBookings
);

module.exports = router;