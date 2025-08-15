import express from "express";
import {
  createPengajuan,
  getAllPengajuan,
  getPengajuanById,
  updatePengajuan,
  deletePengajuan,
} from "../controllers/pengajuanController.js";
import { protect, adminOnly, validateSession } from "../middleware/authMiddleware.js"; // Import validateSession
const router = express.Router();

// @route   GET /api/pengajuan
// @desc    Get all pengajuan (for user or admin)
// @access  Private
router.get("/", protect, validateSession, getAllPengajuan); // Add validateSession

// @route   GET /api/pengajuan/:id
// @desc    Get a pengajuan by ID
// @access  Private
router.get("/:id", protect, validateSession, getPengajuanById); // Add validateSession

// @route   POST /api/pengajuan
// @desc    Create a new pengajuan
// @access  Private
router.post("/", protect, validateSession, createPengajuan); // Add validateSession

// @route   PUT /api/pengajuan/:id
// @desc    Update a pengajuan
// @access  Private
router.put("/:id", protect, validateSession, updatePengajuan); // Add validateSession

// @route   DELETE /api/pengajuan/:id
// @desc    Delete a pengajuan
// @access  Private
router.delete("/:id", protect, validateSession, deletePengajuan); // Add validateSession

export default router;
