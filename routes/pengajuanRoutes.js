import express from "express";
import {
  createPengajuan,
  getAllPengajuan,
  getPengajuanById,
  updatePengajuan,
  deletePengajuan,
  updateDocumentStatus,
  rejectPengajuan,
  prepareDocumentForEditing,
  generateEditedDocument,
  sendDocumentToUser,
} from "../controllers/pengajuanController.js";
import { protect, adminOnly, validateSession } from "../middleware/authMiddleware.js";

const router = express.Router();

// @route   GET /api/pengajuan
// @desc    Get all pengajuan (for user or admin)
// @access  Private
router.get("/", protect, validateSession, getAllPengajuan);

// @route   GET /api/pengajuan/:id
// @desc    Get a pengajuan by ID
// @access  Private
router.get("/:id", protect, validateSession, getPengajuanById);

// @route   POST /api/pengajuan
// @desc    Create a new pengajuan
// @access  Private
router.post("/", protect, validateSession, createPengajuan);

// @route   PUT /api/pengajuan/:id
// @desc    Update a pengajuan
// @access  Private
router.put("/:id", protect, validateSession, updatePengajuan);

// @route   DELETE /api/pengajuan/:id
// @desc    Delete a pengajuan
// @access  Private
router.delete("/:id", protect, validateSession, deletePengajuan);

// @route   PUT /api/pengajuan/documents/:id/status
// @desc    Update document status (admin only)
// @access  Private, Admin
router.put(
  "/documents/:id/status",
  protect,
  adminOnly,
  validateSession,
  updateDocumentStatus
);

// @route   PUT /api/pengajuan/:id/reject
// @desc    Reject a pengajuan (admin only)
// @access  Private, Admin
router.put("/:id/reject", protect, adminOnly, validateSession, rejectPengajuan);

// --- NEW DOCUMENT WORKFLOW ---

// @route   GET /api/pengajuan/:id/prepare-document
// @desc    Get pre-filled HTML for editing (admin only)
// @access  Private, Admin
router.get(
  "/:id/prepare-document",
  protect,
  adminOnly,
  validateSession,
  prepareDocumentForEditing
);

// @route   POST /api/pengajuan/:id/generate-edited-document
// @desc    Generate PDF from edited HTML (admin only)
// @access  Private, Admin
router.post(
  "/:id/generate-edited-document",
  protect,
  adminOnly,
  validateSession,
  generateEditedDocument
);

// @route   POST /api/pengajuan/:id/send-document
// @desc    Send final document to user (admin only)
// @access  Private, Admin
router.post(
  "/:id/send-document",
  protect,
  adminOnly,
  validateSession,
  sendDocumentToUser
);

export default router;