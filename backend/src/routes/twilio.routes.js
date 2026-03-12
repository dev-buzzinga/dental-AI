import express from 'express';
import { generateToken, getActiveNumbers } from '../controllers/twilio.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate', authenticateUser, generateToken);
router.get('/get-active-numbers', authenticateUser, getActiveNumbers);

export default router;
