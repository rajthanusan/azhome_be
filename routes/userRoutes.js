// routes/user.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadProfile, uploadDocument, uploadPastWork } = require('../config/cloudinary');

router.post(
  '/worker/nic', 
  authenticate, 
  authorize(['worker']), 
  uploadDocument.fields([
    { name: 'nicFront', maxCount: 1 },
    { name: 'nicBack', maxCount: 1 }
  ]),
  userController.uploadNIC
);

router.post(
  '/worker/certificates', 
  authenticate, 
  authorize(['worker']), 
  uploadDocument.single('certificate'),
  userController.uploadCertificate
);

router.post(
  '/worker/past-works', 
  authenticate, 
  authorize(['worker']), 
  uploadPastWork.array('pastWorks', 5), // Limit to 5 images at a time
  userController.uploadPastWork
);


// Get all workers (filterable by service)
router.get('/workers', authenticate, authorize(['user']), userController.getAllWorkers);

router.get('/profile', authenticate, authorize(['user', 'admin']), userController.getProfile);
router.put('/profile', authenticate, authorize(['user', 'admin']), uploadProfile.single('profilePicture'), userController.updateProfile);

router.get('/', authenticate, authorize(['user']), userController.getAllWorkers);

router.get('/profile-worker', authenticate, authorize(['worker']), userController.getworkerProfile);
router.put(
  '/profile-worker', 
  authenticate, 
  authorize(['worker']), 
  uploadProfile.single('profilePicture'),
  userController.updateworkerProfile
);

// New routes for worker documents

// Admin verification route
router.patch(
  '/admin/verify-worker/:id', 
  authenticate, 
  authorize(['admin']), 
  userController.verifyWorker
);

router.get('/admin/workers', authenticate, authorize(['admin']), userController.getAllWorkersForAdmin);
router.get('/admin/users', authenticate, authorize(['admin']), userController.getAllRegularUsers);
router.delete('/admin/delete/:id', authenticate, authorize(['admin']), userController.deleteUserOrWorker);
router.get('/admin/worker/:id', authenticate, authorize(['admin']), userController.getWorkerDetails);

module.exports = router;