import express from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { protect, adminOnly, validateSession } from "../middleware/authMiddleware.js";

const router = express.Router();

// @route   GET /api/dashboard
// @desc    Get data for admin dashboard
// @access  Private, Admin
router.get("/", protect, adminOnly, validateSession, getDashboardData);

export default router;
