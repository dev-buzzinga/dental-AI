import express from 'express';
import { voiceResponse, callStatusCallback } from '../controllers/incoming-call.controller.js';

const router = express.Router();

router.post('/voice', voiceResponse);
router.post('/status-callback', callStatusCallback);

export default router;
