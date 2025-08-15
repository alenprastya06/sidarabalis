import express from "express";
import {
  createPersyaratan,
  getAllPersyaratan,
  getPersyaratanById,
  updatePersyaratan,
  deletePersyaratan,
} from "../controllers/persyaratanController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// @route   POST /api/persyaratan
// @desc    Create a new persyaratan
// @access  Private, Admin
router.post("/", protect, adminOnly, createPersyaratan);

// @route   GET /api/persyaratan
// @desc    Get all persyaratan (optional: filter by jenis_pengajuan_id)
// @access  Private
router.get("/", protect, getAllPersyaratan);

// @route   GET /api/persyaratan/:id
// @desc    Get a persyaratan by ID
// @access  Private
router.get("/:id", protect, getPersyaratanById);

// @route   PUT /api/persyaratan/:id
// @desc    Update a persyaratan
// @access  Private, Admin
router.put("/:id", protect, adminOnly, updatePersyaratan);

// @route   DELETE /api/persyaratan/:id
// @desc    Delete a persyaratan
// @access  Private, Admin
router.delete("/:id", protect, adminOnly, deletePersyaratan);

export default router;
