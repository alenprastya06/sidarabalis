import JenisPengajuan from "../models/JenisPengajuan.js";
import Persyaratan from "../models/Persyaratan.js";
import Pengajuan from "../models/Pengajuan.js";
import { Op } from "sequelize"; // Import Pengajuan model

export const createJenisPengajuan = async (req, res) => {
  const { name } = req.body;
  try {
    const jenisPengajuan = await JenisPengajuan.create({ name });
    res.status(201).json(jenisPengajuan);
  } catch (error) {
    res.status(400).json({ message: "Error creating jenis pengajuan", error: error.message });
  }
};

export const getJenisPengajuan = async (req, res) => {
  try {
    // 1. Get all Jenis Pengajuan and user's active pengajuan in parallel
    const [allJenisPengajuan, userPengajuan] = await Promise.all([
      JenisPengajuan.findAll({
        include: [
          {
            model: Persyaratan,
            attributes: ['nama_dokument'],
          },
        ],
      }),
      Pengajuan.findAll({
        where: { 
          user_id: req.user.id,
          status: { [Op.notIn]: ['completed', 'rejected'] } // Exclude completed and rejected
        },
        attributes: ['id', 'status', 'jenis_pengajuan_id'],
      })
    ]);

    // 2. Create a map of user's pengajuan for quick lookup
    const userPengajuanMap = new Map();
    for (const p of userPengajuan) {
      userPengajuanMap.set(p.jenis_pengajuan_id, p);
    }

    // 3. Transform the response
    const transformedJenisPengajuan = allJenisPengajuan.map(jp => {
      const plainJp = jp.get({ plain: true });
      
      // Attach active pengajuan info if it exists
      if (userPengajuanMap.has(plainJp.id)) {
        const activePengajuan = userPengajuanMap.get(plainJp.id);
        plainJp.pengajuan_aktif = {
          id_pengajuan: activePengajuan.id,
          nama_pengajuan: plainJp.name, // The name of the submission type
          status: activePengajuan.status,
        };
      }

      // Simplify persyaratan to an array of strings
      if (plainJp.Persyaratans && Array.isArray(plainJp.Persyaratans)) {
        plainJp.Persyaratans = plainJp.Persyaratans.map(p => p.nama_dokument);
      }
      
      return plainJp;
    });

    res.status(200).json(transformedJenisPengajuan);
  } catch (error) {
    res.status(500).json({ message: "Error fetching jenis pengajuan", error: error.message });
  }
};