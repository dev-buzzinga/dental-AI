import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { getOnePatient, upcomingAppointment, historyAppointment, getPatientInsurance, upsertPatientInsurance } from '../controllers/patients.controller.js';

const router = express.Router();

router.get('/get-one-patient', authenticateUser, getOnePatient);
router.get('/upcoming-appointment', authenticateUser, upcomingAppointment);
router.get('/history-appointment', authenticateUser, historyAppointment);
router.get('/insurance', authenticateUser, getPatientInsurance);
router.put('/insurance', authenticateUser, upsertPatientInsurance);
export default router;