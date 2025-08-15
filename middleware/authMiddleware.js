import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js"; // Import User model
dotenv.config();

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  next();
};

export const validateSession = async (req, res, next) => {
  if (!req.user || !req.user.sessionId) {
    return res.status(401).json({ message: "Session ID missing from token" });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user || user.current_session_id !== req.user.sessionId) {
      return res.status(401).json({ message: "Session invalidated. Please log in again." });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error during session validation", error: error.message });
  }
};