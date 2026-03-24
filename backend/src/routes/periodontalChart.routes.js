import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
  createPeriodontalChart,
  getAllPeriodontalCharts,
  getOnePeriodontalChart,
  updatePeriodontalChart,
  deletePeriodontalChart,
  uploadPeriodentalChartAudio,
  uploadPeriodentalChartSummary,
  getSummaryStatus
} from "../controllers/periodontalChart.controller.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Core CRUD operations
router.post('/', createPeriodontalChart);
router.get('/user', getAllPeriodontalCharts);
router.get('/:id', getOnePeriodontalChart);
router.put('/:id', updatePeriodontalChart);
router.delete('/:id', deletePeriodontalChart);

// Audio & Transcription endpoints
router.post('/:id/audio', uploadPeriodentalChartAudio);
router.post('/:id/summarize', uploadPeriodentalChartSummary);
router.get('/:id/summary-status', getSummaryStatus);

export default router;
