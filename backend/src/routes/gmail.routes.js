import express from 'express';
import {
    connectGmail,
    getReferralEmails,
    getGmailThreads,
    getThreadHistory,
    getAttachment,
} from '../controllers/gmail.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/connect', authenticateUser, connectGmail);
router.get('/threads/list', authenticateUser, getGmailThreads);
router.get('/threads/:threadId/history', authenticateUser, getThreadHistory);
router.get('/messages/:messageId/attachment', authenticateUser, getAttachment);
router.get('/emails/referrals', authenticateUser, getReferralEmails);

export default router;
