import express from "express";
import { getProfile } from "../controllers/profileController.js";
import { protect, validateSession } from "../middleware/authMiddleware.js";

const router = express.Router();

// @route   GET /api/profile
// @desc    Get current user's profile
// @access  Private
router.get("/", protect, validateSession, getProfile);

export default router;
