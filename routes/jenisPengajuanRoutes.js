import express from "express";
import { createJenisPengajuan, getJenisPengajuan } from "../controllers/jenisPengajuanController.js";
import { protect, adminOnly, validateSession } from "../middleware/authMiddleware.js"; // Import validateSession

const router = express.Router();

router.post("/", protect, adminOnly, validateSession, createJenisPengajuan); // Add validateSession
router.get("/", protect, validateSession, getJenisPengajuan); // Add validateSession

export default router;
