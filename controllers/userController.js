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
    const { fullName, address, service, hourlyRate } = req.body;
    const updateData = { fullName, address, service, hourlyRate };

    // Only update hourlyRate if it's provided and valid
    if (hourlyRate !== undefined && hourlyRate !== null) {
      updateData.hourlyRate = parseFloat(hourlyRate);
    }

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


exports.uploadNIC = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete old NIC images if they exist
    if (user.nic?.front?.public_id) {
      await cloudinary.uploader.destroy(user.nic.front.public_id);
    }
    if (user.nic?.back?.public_id) {
      await cloudinary.uploader.destroy(user.nic.back.public_id);
    }
    
    // Update NIC information
    user.nic = {
      front: req.files.nicFront ? {
        url: req.files.nicFront[0].path,
        public_id: req.files.nicFront[0].filename
      } : user.nic?.front,
      back: req.files.nicBack ? {
        url: req.files.nicBack[0].path,
        public_id: req.files.nicBack[0].filename
      } : user.nic?.back
    };
    
    // Reset verification status when documents are updated
    user.isVerified = false;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'NIC uploaded successfully',
      nic: user.nic
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadCertificate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, issuedDate, issuingAuthority } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'Certificate file is required' });
    }
    
    // Add new certificate
    user.certificates.push({
      url: req.file.path,
      public_id: req.file.filename,
      title,
      issuedDate,
      issuingAuthority
    });
    
    // Reset verification status when documents are updated
    user.isVerified = false;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Certificate uploaded successfully',
      certificate: user.certificates[user.certificates.length - 1]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.uploadPastWork = async (req, res) => {
  try {
    const userId = req.user.id;
    const { descriptions } = req.body; // Expecting an array of descriptions
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }
    
    // Add new past works
    req.files.forEach((file, index) => {
      user.pastWorks.push({
        url: file.path,
        public_id: file.filename,
        description: descriptions && descriptions[index] ? descriptions[index] : '',
        date: new Date()
      });
    });
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Past works uploaded successfully',
      pastWorks: user.pastWorks.slice(-req.files.length) // Return the newly added works
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    
    const worker = await User.findById(id);
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    worker.isVerified = isVerified;
    await worker.save();
    
    res.json({
      success: true,
      message: `Worker ${isVerified ? 'verified' : 'unverified'} successfully`,
      worker: {
        id: worker._id,
        fullName: worker.fullName,
        isVerified: worker.isVerified
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getWorkerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const worker = await User.findById(id)
      .select('-password -resetPasswordToken -resetPasswordExpires -__v');
    
    if (!worker || worker.role !== 'worker') {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }
    
    res.json({
      success: true,
      data: worker
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }}