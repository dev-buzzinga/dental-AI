import express from 'express';
import { initInformation, findDoctor, findDoctorsSlots, updateIntent, findAppointment, bookAppointment } from '../controllers/vapi.controller.js';

const router = express.Router();


router.post('/initInformation', initInformation);
router.post('/find-doctor', findDoctor);
router.post('/find-slots', findDoctorsSlots);
router.post('/updateIntent', updateIntent);
router.post('/find-appointment', findAppointment);
router.post('/book-appointment', bookAppointment);
export default router;