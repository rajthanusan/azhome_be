const express = require('express');
const router = express.Router();
const {
  addReview,
  getWorkerReviews,
  getClientReviews,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

// Add a review
router.post('/', authenticate, addReview);

// Get reviews for a worker
router.get('/worker/:workerId', getWorkerReviews);

// Get reviews by a client
router.get('/client/:clientId', authenticate, getClientReviews);

// Update a review
router.put('/:reviewId', authenticate, updateReview);

// Delete a review
router.delete('/:reviewId', authenticate, deleteReview);

module.exports = router;