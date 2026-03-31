import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { getOnePatient, upcomingAppointment, historyAppointment } from '../controllers/patients.controller.js';

const router = express.Router();

router.get('/get-one-patient', authenticateUser, getOnePatient);
router.get('/upcoming-appointment', authenticateUser, upcomingAppointment);
router.get('/history-appointment', authenticateUser, historyAppointment);
export default router;