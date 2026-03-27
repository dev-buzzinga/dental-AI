import express from "express";
import * as faqController from "../controllers/faq.controller.js";
import { authenticateUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add", authenticateUser, faqController.addFaq);
router.put("/update", authenticateUser, faqController.updateFaq);
router.get("/all", authenticateUser, faqController.getAllFaqs);
router.get("/search", authenticateUser, faqController.searchFaqs);
router.get("/:faq_id", authenticateUser, faqController.getOneFaq);
router.delete("/:faq_id", authenticateUser, faqController.deleteFaq);

export default router;
