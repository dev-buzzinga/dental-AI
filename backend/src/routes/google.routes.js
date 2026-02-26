import express from 'express';
import { connectGoogle, googleCallback } from '../controllers/google.controller.js';

const router = express.Router();

router.get('/connect', connectGoogle);
router.get('/callback', googleCallback);

export default router;
