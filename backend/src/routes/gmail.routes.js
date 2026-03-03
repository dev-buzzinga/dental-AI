import express from 'express';
import { connectGmail, getReferralEmails, getGmailThreads } from '../controllers/gmail.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/connect', authenticateUser, connectGmail);
router.get('/threads/list', authenticateUser, getGmailThreads);
router.get('/emails/referrals', authenticateUser, getReferralEmails);

export default router;
