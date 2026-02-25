import express from 'express';
import { makeOutgoingCall } from '../controllers/outgoing-call.controller.js';
const router = express.Router();

router.post('/make-call', makeOutgoingCall);

export default router;
