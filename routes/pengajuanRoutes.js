import express from "express";
import {
  createPengajuan,
  getAllPengajuan,
  getPengajuanById,
  getPengajuanUser,
  updatePengajuan,
  deletePengajuan,
} from "../controllers/pengajuanController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
const router = express.Router();

// @route   GET /api/pengajuan
// @desc    Get all pengajuan (admin only)
// @access  Private, Admin
router.get("/", protect, adminOnly, getAllPengajuan);

// @route   GET /api/pengajuan/user
// @desc    Get all pengajuan for a user
// @access  Private
router.get("/user", protect, getPengajuanUser);

// @route   GET /api/pengajuan/:id
// @desc    Get a pengajuan by ID
// @access  Private
router.get("/:id", protect, getPengajuanById);

// @route   POST /api/pengajuan
// @desc    Create a new pengajuan
// @access  Private
router.post("/", protect, createPengajuan);

// @route   PUT /api/pengajuan/:id
// @desc    Update a pengajuan
// @access  Private
router.put("/:id", protect, updatePengajuan);

// @route   DELETE /api/pengajuan/:id
// @access  Private
router.delete("/:id", protect, deletePengajuan);

export default router;
