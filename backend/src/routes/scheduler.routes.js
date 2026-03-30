import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { getSchedulerConfig, saveSchedulerConfig, getPublicSchedulerConfig, getPublicAppointmentTypes, getAvailableTimeSlots, createPublicAppointment } from '../controllers/scheduler.controller.js';
const router = express.Router();

// Authenticated routes (for clinic settings)
router.get('/config/get', authenticateUser, getSchedulerConfig);
router.post('/config/save', authenticateUser, saveSchedulerConfig);

// Public routes
router.get('/config/get/:uniqueKey', getPublicSchedulerConfig);
router.get('/appointment-types/get/:uniqueKey', getPublicAppointmentTypes);
router.get('/available-slots/get/:uniqueKey', getAvailableTimeSlots);
router.post('/create-appointment/public/:uniqueKey', createPublicAppointment);


export default router; 