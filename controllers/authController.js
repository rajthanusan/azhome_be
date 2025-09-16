// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const dotenv = require("dotenv");

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'rajthanusan08@gmail.com', 
    pass: 'mumfvummfkwbqsyu',        
  },
});

// Register a new user
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, address, role, service, hourlyRate } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "Email already registered" 
      });
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      password,
      address,
      role: role || "user",
      ...(role === "worker" && { service }),
      ...(role === "worker" && { hourlyRate })
    });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Send welcome email
    const mailOptions = {
      from: `"AZHome Team" <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject: "Welcome to AZHome",
      html: `
      <p>Dear ${fullName},</p>
  
      <p>Welcome to <strong>AZHome</strong>! We're thrilled to have you on board.</p>
  
      <p>Your account has been successfully created, and you're now part of a trusted platform dedicated to delivering high-quality home services. From plumbing and electrical work to painting and landscaping, we're here to help you maintain and improve your property with ease.</p>
  
      <p>As a registered user, you can now:</p>
      <ul>
        <li>Book professional services with just a few clicks</li>
        <li>Track and manage your service requests</li>
        <li>Choose from a variety of service packages tailored to your needs</li>
        <li>Access exclusive offers and updates</li>
      </ul>
  
      <p>If you have any questions or need assistance, our support team is always ready to help.</p>
  
      <p>Thank you for choosing AZHome - where your comfort and satisfaction come first.</p>
  
      <p>Best regards,</p>
      <p><strong>The AZHome Team</strong></p>
    `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        address: user.address,
        ...(user.service && { service: user.service }),
        ...(user.hourlyRate && { hourlyRate: user.hourlyRate })
      },
      token 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        address: user.address,
        ...(user.service && { service: user.service }),
        ...(user.profilePicture && { profilePicture: user.profilePicture }),
        ...(typeof user.averageRating === 'number' && { averageRating: user.averageRating }),
        ...(typeof user.reviewCount === 'number' && { reviewCount: user.reviewCount })
      },
      token
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Generate and save reset token
    const resetToken = Math.floor(10000 + Math.random() * 90000).toString();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    const mailOptions = {
      from: `"AZHome Team" <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject: "Password Reset Code",
      html: `
      <p>Dear User,</p>
    
      <p>We received a request to reset your password for your AZHome account.</p>
    
      <p><strong>Your password reset code is:</strong></p>
      <h2 style="color: #2E86C1;">${resetToken}</h2>
    
      <p>Please enter this code in the password reset page to proceed. For your security, this code will expire shortly and can only be used once.</p>
    
      <p>If you did not request a password reset, please ignore this email or contact our support team immediately.</p>
    
      <p>Thank you,<br/>
      <strong>The AZHome Team</strong></p>
    `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true,
      message: "Password reset code sent to email" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired reset code" 
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ 
      success: true,
      message: "Password reset successful" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};