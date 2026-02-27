import express from 'express';
import { connectGoogle, googleCallback, createAppointment } from '../controllers/appointment.controller.js';

const router = express.Router();

router.get('/google/connect', connectGoogle);
router.get('/google/callback', googleCallback);
router.post('/create-appointment', createAppointment);

export default router;
