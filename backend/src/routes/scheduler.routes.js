import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { getSchedulerConfig, saveSchedulerConfig } from '../controllers/scheduler.controller.js';
const router = express.Router();

// Authenticated routes (for clinic settings)
router.get('/config/get', authenticateUser, getSchedulerConfig);
router.post('/config/save', authenticateUser, saveSchedulerConfig);

export default router; 