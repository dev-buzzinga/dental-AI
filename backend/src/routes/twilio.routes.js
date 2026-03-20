import express from 'express';
import { generateToken, getActiveNumbers, setupWebhooks } from '../controllers/twilio.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate/token', authenticateUser, generateToken);
router.get('/get-active-numbers', authenticateUser, getActiveNumbers);
router.post('/setup-webhooks', authenticateUser, setupWebhooks);

export default router;
