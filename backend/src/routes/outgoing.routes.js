import express from 'express';
import { makeOutgoingCall, voiceResponse, callStatusCallback, getCallLogs } from '../controllers/outgoing-call.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/make-call', authenticateUser, makeOutgoingCall);
router.post('/voice', voiceResponse);
router.post('/status-callback', callStatusCallback);
router.get('/call-logs', authenticateUser, getCallLogs);
export default router;
