// config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: "dinde6au5",
  api_key: "727325263362545",
  api_secret: "clK8MUVj2aNWqZU8m9GoUcvtspM",
});

// Create different storage configurations for different types of uploads
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "healthcare_profiles",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
});

const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "worker_documents",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
  },
});

const pastWorkStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "past_works",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

// Create different upload middleware for different file types
const uploadProfile = multer({ storage: profileStorage });
const uploadDocument = multer({ storage: documentStorage });
const uploadPastWork = multer({ storage: pastWorkStorage });

module.exports = {
  cloudinary,
  uploadProfile,
  uploadDocument,
  uploadPastWork
};