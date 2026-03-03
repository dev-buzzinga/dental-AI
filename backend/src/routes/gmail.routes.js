import express from 'express';
import { connectGmail } from '../controllers/gmail.controller.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/connect', authenticateUser, connectGmail);
export default router;
