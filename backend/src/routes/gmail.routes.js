import express from 'express';
import { connectGmail, gmailCallback } from '../controllers/gmail.controller.js';

const router = express.Router();

router.post('/connect', connectGmail);
router.get('/callback', gmailCallback);
export default router;
