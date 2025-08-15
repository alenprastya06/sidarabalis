import express from "express";
import {
  createPersyaratan,
  getAllPersyaratan,
  getPersyaratanById,
  updatePersyaratan,
  deletePersyaratan,
} from "../controllers/persyaratanController.js";
import { protect, adminOnly, validateSession } from "../middleware/authMiddleware.js"; // Import validateSession

const router = express.Router();

// @route   POST /api/persyaratan
// @desc    Create a new persyaratan
// @access  Private, Admin
router.post("/", protect, adminOnly, validateSession, createPersyaratan); // Add validateSession

// @route   GET /api/persyaratan
// @desc    Get all persyaratan (optional: filter by jenis_pengajuan_id)
// @access  Private
router.get("/", protect, validateSession, getAllPersyaratan); // Add validateSession

// @route   GET /api/persyaratan/:id
// @desc    Get a persyaratan by ID
// @access  Private
router.get("/:id", protect, validateSession, getPersyaratanById); // Add validateSession

// @route   PUT /api/persyaratan/:id
// @desc    Update a persyaratan
// @access  Private, Admin
router.put("/:id", protect, adminOnly, validateSession, updatePersyaratan); // Add validateSession

// @route   DELETE /api/persyaratan/:id
// @desc    Delete a persyaratan
// @access  Private, Admin
router.delete("/:id", protect, adminOnly, validateSession, deletePersyaratan); // Add validateSession

export default router;