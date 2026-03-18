import express from 'express';
import { makeOutgoingCall, voiceResponse, callStatusCallback, getCallLogs, recordingCallback, transcriptionCallback, transcriptionCallbackPost } from '../controllers/outgoing-call.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/make-call', authenticateUser, makeOutgoingCall);
router.post('/voice', voiceResponse);
router.post('/status-callback', callStatusCallback);
router.get('/call-logs', authenticateUser, getCallLogs);
router.post('/recording-status', recordingCallback);
router.get('/transcription-status', transcriptionCallback);
router.post('/transcription-status', transcriptionCallbackPost);
export default router;
