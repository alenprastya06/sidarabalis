import express from "express";
import { resetDatabase } from "../controllers/adminController.js";
import { protect, adminOnly, validateSession } from "../middleware/authMiddleware.js";

const router = express.Router();

// @route   DELETE /api/admin/reset-database
// @desc    DANGEROUS: Resets the database by deleting all transactional data and non-admin users.
// @access  Private, Admin
router.delete("/reset-database", protect, adminOnly, validateSession, resetDatabase);

export default router;
