const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate ,authorize} = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// Get all workers (filterable by service)
router.get('/workers',  authenticate, authorize(['user']), userController.getAllWorkers);

router.get('/profile', authenticate, authorize(['user', 'admin']), userController.getProfile);

router.put('/profile', authenticate, authorize(['user', 'admin']), upload.single('profilePicture'), userController.updateProfile);


router.get('/', authenticate, authorize(['user']), userController.getAllWorkers);

router.get('/profile-worker', authenticate, authorize(['worker']), userController.getworkerProfile);
router.put('/profile-worker', authenticate, authorize(['worker']), upload.single('profilePicture'), userController.updateworkerProfile);


router.get('/admin/workers', authenticate, authorize(['admin']), userController.getAllWorkersForAdmin); // View all workers
router.get('/admin/users', authenticate, authorize(['admin']), userController.getAllRegularUsers); // View all users
router.delete('/admin/delete/:id', authenticate, authorize(['admin']), userController.deleteUserOrWorker);

// Get all workers (filterable by service)


module.exports = router;