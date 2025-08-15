import express from "express";
import { createJenisPengajuan, getJenisPengajuan } from "../controllers/jenisPengajuanController.js"; // Import getJenisPengajuan
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, adminOnly, createJenisPengajuan);
router.get("/", protect, getJenisPengajuan); // New GET route

export default router;