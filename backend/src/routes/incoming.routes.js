import express from 'express';
import { makeIncomingCall } from '../controllers/incoming-call.controller.js';
const router = express.Router();

router.post('/make-call', makeIncomingCall);
export default router;
