const Chat = require("../models/Chat");
const User = require("../models/User");

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, content } = req.body;
    const sender = req.user._id;

    // Check if recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    // Create message
    const message = await Chat.create({
      sender,
      recipient,
      content,
    });

    // Populate sender and recipient details
    const populatedMessage = await Chat.findById(message._id)
      .populate("sender", "fullName email role profilePicture")
      .populate("recipient", "fullName email role profilePicture");

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get conversation between two users
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Chat.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    })
      .populate("sender", "fullName role profilePicture")
      .populate("recipient", "fullName role profilePicture")
      .sort("createdAt");

    // Mark received messages as read
    await Chat.updateMany(
      {
        sender: userId,
        recipient: currentUserId,
        isRead: false,
      },
      { isRead: true, readAt: Date.now() }
    );

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all conversations for current user
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get distinct users with whom the current user has chatted
    const conversations = await Chat.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { recipient: userId }],
        },
      },
      {
        $project: {
          otherUser: {
            $cond: [{ $eq: ["$sender", userId] }, "$recipient", "$sender"],
          },
          message: "$$ROOT",
        },
      },
      {
        $group: {
          _id: "$otherUser",
          lastMessage: { $last: "$message" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$message.recipient", userId] },
                    { $eq: ["$message.isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const recipientId = req.user._id;

    await Chat.updateMany(
      {
        sender: senderId,
        recipient: recipientId,
        isRead: false,
      },
      { isRead: true, readAt: Date.now() }
    );

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};