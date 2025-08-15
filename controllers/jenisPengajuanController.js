import JenisPengajuan from "../models/JenisPengajuan.js";
import Persyaratan from "../models/Persyaratan.js";

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
    const jenisPengajuan = await JenisPengajuan.findAll({
      include: [
        {
          model: Persyaratan,
          attributes: ['nama_dokument'], // Only fetch nama_dokument
        },
      ],
    });

    // Transform the response to get an array of strings for Persyaratans
    const transformedJenisPengajuan = jenisPengajuan.map(jp => {
      const plainJp = jp.get({ plain: true }); // Get plain data
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