import express from 'express';
import { connectGmail, getReferralEmails } from '../controllers/gmail.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/connect', authenticateUser, connectGmail);
router.get('/emails/referrals', authenticateUser, getReferralEmails);

export default router;
