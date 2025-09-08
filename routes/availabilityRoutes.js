const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');
const { authenticate, authorize } = require('../middleware/auth');

// Lawyer availability routes
router.post('/', 
  authenticate, 
  authorize(['worker']), 
  availabilityController.addAvailability
);

router.get('/', availabilityController.getAvailability);

router.put('/:id', 
  authenticate, 
  authorize(['worker']), 
  availabilityController.updateAvailability
);

router.delete('/:id', 
  authenticate, 
  authorize(['worker']), 
  availabilityController.deleteAvailability
);

// Client booking route
router.post('/:id/book', 
  authenticate, 
  authorize(['user']), 
  availabilityController.bookAvailability
);

module.exports = router;