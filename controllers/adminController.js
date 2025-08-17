import Pengajuan from "../models/Pengajuan.js";
import Document from "../models/Document.js";
import Owner from "../models/Owner.js";
import Lahan from "../models/Lahan.js";
import User from "../models/User.js";
import { Op } from "sequelize";

/**
 * DANGEROUS: This function will permanently delete data from the database.
 * It deletes all transactional data (submissions, documents, etc.) and all non-admin users.
 * Master data like submission types and requirements are preserved.
 * USE WITH EXTREME CAUTION.
 */
export const resetDatabase = async (req, res) => {
  try {
    // The order of deletion is important to avoid foreign key constraint errors.
    // 1. Delete all documents, owners, and lahans first as they depend on Pengajuan.
    await Document.destroy({ where: {} });
    await Owner.destroy({ where: {} });
    await Lahan.destroy({ where: {} });

    // 2. Delete all Pengajuan records.
    await Pengajuan.destroy({ where: {} });

    // 3. Delete all users that are not admins.
    await User.destroy({ 
      where: { 
        role: { [Op.ne]: 'admin' } 
      } 
    });

    res.status(200).json({ message: "Database has been reset successfully. All transactional data and non-admin users have been deleted." });

  } catch (error) {
    res.status(500).json({
      message: "Error resetting the database",
      error: error.message,
    });
  }
};