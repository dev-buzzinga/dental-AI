import express from 'express';
import { makeOutgoingCall, voiceResponse, callStatusCallback, getCallLogs, getCallDetail, getRecording, recordingCallback, transcriptionCallback, transcriptionCallbackPost } from '../controllers/outgoing-call.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/make-call', authenticateUser, makeOutgoingCall);
router.post('/voice', voiceResponse);
router.get('/call-logs', authenticateUser, getCallLogs);
router.get('/call-detail', authenticateUser, getCallDetail);
router.get('/get-recording/:recording_sid',authenticateUser,getRecording);
// -------------------webhook----------------------------------
router.post('/status-callback', callStatusCallback);
router.post('/recording-status', recordingCallback);
router.get('/transcription-status', transcriptionCallback);
router.post('/transcription-status', transcriptionCallbackPost);
export default router;
