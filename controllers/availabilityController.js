const Availability = require('../models/Availability');
const User = require('../models/User');

// Add availability for worker
exports.addAvailability = async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;
    const workerId = req.user._id;

    // Check if user is a worker
    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker') {
      return res.status(403).json({ message: 'Only workers can set availability' });
    }

    // Validate time slot
    if (startTime >= endTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const newAvailability = await Availability.create({
      worker: workerId,
      date,
      startTime,
      endTime
    });

    res.status(201).json(newAvailability);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This time slot already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get worker availability
exports.getAvailability = async (req, res) => {
  try {
    const { workerId, date } = req.query;
    const query = {};

    if (workerId) query.worker = workerId;
    if (date) query.date = new Date(date);

    const availabilities = await Availability.find(query)
      .populate('worker', 'fullName service address')
      .populate('bookedBy', 'fullName email');

    res.json(availabilities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update availability
exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime } = req.body;

    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    // Check if the user owns this availability
    if (availability.worker.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this availability' });
    }

    // Don't allow updates if already booked
    if (availability.isBooked) {
      return res.status(400).json({ message: 'Cannot update a booked time slot' });
    }

    availability.date = date || availability.date;
    availability.startTime = startTime || availability.startTime;
    availability.endTime = endTime || availability.endTime;

    await availability.save();
    res.json(availability);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete availability
exports.deleteAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    // Check if the user owns this availability
    if (availability.worker.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this availability' });
    }

    // Don't allow deletion if already booked
    if (availability.isBooked) {
      return res.status(400).json({ message: 'Cannot delete a booked time slot' });
    }

    await Availability.deleteOne({ _id: id });
    res.json({ message: 'Availability deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Book a time slot
exports.bookAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user._id;

    const availability = await Availability.findById(id);
    if (!availability) {
      return res.status(404).json({ message: 'Availability not found' });
    }

    if (availability.isBooked) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }

    availability.isBooked = true;
    availability.bookedBy = clientId;
    await availability.save();

    res.json(availability);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};