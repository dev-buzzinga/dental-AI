import express from 'express';
import {
    connectGmail,
    getReferralEmails,
    getGmailThreads,
    getThreadHistory,
    getAttachment,
    sendReply,
    runAppointmentCron,
} from '../controllers/gmail.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/connect', authenticateUser, connectGmail);
router.get('/threads/list', authenticateUser, getGmailThreads);
router.get('/threads/:threadId/history', authenticateUser, getThreadHistory);
router.post('/threads/:threadId/reply', authenticateUser, sendReply);
router.get('/messages/:messageId/attachment', authenticateUser, getAttachment);
router.get('/emails/referrals', authenticateUser, getReferralEmails);
// Cron hook (can be called from Supabase scheduler / external cron)
router.post('/cron/appointments', runAppointmentCron);

export default router;
