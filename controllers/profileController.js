import User from "../models/User.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'current_session_id'] } // Exclude sensitive info
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (error) {
    res.status(500).json({ message: "Error fetching profile data", error: error.message });
  }
};