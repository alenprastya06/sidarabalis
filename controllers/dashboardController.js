import Pengajuan from "../models/Pengajuan.js";
import Document from "../models/Document.js";
import User from "../models/User.js";
import { Op } from "sequelize";

export const getDashboardData = async (req, res) => {
  try {
    // 1. Aggregate Counts
    const [totalPengajuan, totalDokumen, totalDisetujui, totalPending, totalDitolak] = await Promise.all([
      Pengajuan.count(),
      Document.count(),
      Pengajuan.count({ where: { status: 'approved' } }),
      Pengajuan.count({ where: { status: 'pending' } }),
      Pengajuan.count({ where: { status: 'rejected' } })
    ]);

    // 2. Lists of Pengajuan
    const [listDisetujui, listPending, listDitolak] = await Promise.all([
        Pengajuan.findAll({ 
            where: { status: 'approved' },
            include: [User],
            order: [['updatedAt', 'DESC']]
        }),
        Pengajuan.findAll({ 
            where: { status: 'pending' },
            include: [User],
            order: [['updatedAt', 'DESC']]
        }),
        Pengajuan.findAll({ 
            where: { status: 'rejected' },
            include: [User],
            order: [['updatedAt', 'DESC']]
        })
    ]);

    res.json({
      statistics: {
        total_pengajuan: totalPengajuan,
        total_dokumen: totalDokumen,
        total_disetujui: totalDisetujui,
        total_pending: totalPending,
        total_ditolak: totalDitolak
      },
      lists: {
        diterima: listDisetujui,
        pending: listPending,
        ditolak: listDitolak
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching dashboard data",
      error: error.message,
    });
  }
};
