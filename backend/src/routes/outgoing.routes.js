import express from 'express';
import { makeOutgoingCall, voiceResponse, callStatusCallback } from '../controllers/outgoing-call.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/make-call', authenticateUser, makeOutgoingCall);
router.post('/voice', voiceResponse);
router.post('/status-callback', callStatusCallback);
export default router;
