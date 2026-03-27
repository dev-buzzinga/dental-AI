import express from "express";
import * as faqController from "../controllers/faq.controller.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add", authenticateUser, faqController.addFaq);
router.put("/update", authenticateUser, faqController.updateFaq);
router.get("/search", authenticateUser, faqController.searchFaqs);

export default router;
