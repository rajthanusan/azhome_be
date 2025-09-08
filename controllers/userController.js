const User = require('../models/User');


exports.getAllWorkers = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { service } = req.query;
    
    // Build filter object
    const filter = { role: 'worker' };
    if (service) {
      filter.service = service;
    }
    
    // Get workers (excluding sensitive information)
    const workers = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires -__v');
    
    res.json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

const cloudinary = require('../config/cloudinary').cloudinary;

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, address } = req.body;
    const updateData = { fullName, address };

    if (req.file) {
      // Delete old image if exists
      if (req.user.profilePicture?.public_id) {
        await cloudinary.uploader.destroy(req.user.profilePicture.public_id);
      }
      
      updateData.profilePicture = {
        url: req.file.path,
        public_id: req.file.filename
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getworkerProfile = async (req, res) => {
  try {
    const worker = await User.findById(req.user.id).select('-password');
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    res.json(worker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateworkerProfile = async (req, res) => {
  try {
    const { fullName, address, service } = req.body;
    const updateData = { fullName, address, service };

    if (req.file) {
      // Delete old image if exists
      if (req.user.profilePicture?.public_id) {
        await cloudinary.uploader.destroy(req.user.profilePicture.public_id);
      }
      
      updateData.profilePicture = {
        url: req.file.path,
        public_id: req.file.filename
      };
    }

    const updatedWorker = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedWorker);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllWorkers = async (req, res) => {
  try {
    const { service } = req.query;
    const filter = { role: 'worker' };
    
    if (service) {
      filter.service = service;
    }

    const workers = await User.find(filter).select('-password');
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: Get all workers (for admin dashboard)
exports.getAllWorkersForAdmin = async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' })
      .select('-password -resetPasswordToken -resetPasswordExpires -__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: workers.length,
      data: workers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// ADMIN: Get all regular users (non-workers)
exports.getAllRegularUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password -resetPasswordToken -resetPasswordExpires -__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// ADMIN: Delete any user or worker by ID
exports.deleteUserOrWorker = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete profile picture from Cloudinary if exists
    if (user.profilePicture?.public_id) {
      await cloudinary.uploader.destroy(user.profilePicture.public_id);
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};