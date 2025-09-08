const Review = require('../models/Review');
const User = require('../models/User');

exports.addReview = async (req, res) => {
  try {
    const { workerId, rating, comment } = req.body;
    const clientId = req.user.id;

    // Validate input
    if (!workerId || !rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is trying to review themselves
    if (workerId === clientId) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }

    // Check if worker exists and is actually a worker
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Check for existing review
    const existingReview = await Review.findOne({ worker: workerId, client: clientId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this worker' });
    }

    // Create new review
    const review = new Review({
      worker: workerId,
      client: clientId,
      rating,
      comment
    });

    await review.save();

    // Update worker's rating stats
    await updateWorkerRating(workerId);

    res.status(201).json(review);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getWorkerReviews = async (req, res) => {
  try {
    const { workerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if worker exists
    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const reviews = await Review.find({ worker: workerId })
      .populate('client', 'fullName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({ worker: workerId });

    res.json({
      reviews,
      totalReviews,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error getting worker reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getClientReviews = async (req, res) => {
  try {
    const { clientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ client: clientId })
      .populate('worker', 'fullName service profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({ client: clientId });

    res.json({
      reviews,
      totalReviews,
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error getting client reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const clientId = req.user.id;

    // Validate input
    if (!rating || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, client: clientId },
      { rating, comment },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Update worker's rating stats
    await updateWorkerRating(review.worker);

    res.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const clientId = req.user.id;

    const review = await Review.findOneAndDelete({ _id: reviewId, client: clientId });

    if (!review) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    // Update worker's rating stats
    await updateWorkerRating(review.worker);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Helper function to update worker's average rating and review count
async function updateWorkerRating(workerId) {
  const reviews = await Review.find({ worker: workerId });
  
  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(1);
    
    await User.findByIdAndUpdate(workerId, { 
      averageRating,
      reviewCount: reviews.length
    });
  } else {
    await User.findByIdAndUpdate(workerId, { 
      averageRating: 0,
      reviewCount: 0
    });
  }
}