import express from 'express';
import { makeOutgoingCall } from '../controllers/outgoing-call.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/make-call', authenticateUser, makeOutgoingCall);

export default router;
