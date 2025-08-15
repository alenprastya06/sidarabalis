import Pengajuan from "../models/Pengajuan.js";
import Owner from "../models/Owner.js";
import Lahan from "../models/Lahan.js";
import Document from "../models/Document.js";
import JenisPengajuan from "../models/JenisPengajuan.js"; // Import the new model

// @desc    Get all pengajuan for a user
// @route   GET /api/pengajuan/user
// @access  Private
export const getPengajuanUser = async (req, res) => {
  const pengajuan = await Pengajuan.findAll({
    where: { user_id: req.user.id },
    include: [Owner, Lahan, Document, JenisPengajuan], // Include JenisPengajuan
  });
  res.json(pengajuan);
};

// @desc    Get all pengajuan (admin only)
// @route   GET /api/pengajuan
// @access  Private, Admin
export const getAllPengajuan = async (req, res) => {
  const pengajuan = await Pengajuan.findAll({
    include: [Owner, Lahan, Document, JenisPengajuan], // Include JenisPengajuan
  });
  res.json(pengajuan);
};

// @desc    Get a pengajuan by ID
// @route   GET /api/pengajuan/:id
// @access  Private
export const getPengajuanById = async (req, res) => {
  const pengajuan = await Pengajuan.findOne({
    where: { id: req.params.id },
    include: [Owner, Lahan, Document, JenisPengajuan], // Include JenisPengajuan
  });

  if (!pengajuan) {
    return res.status(404).json({ message: "Pengajuan not found" });
  }

  // Check if user is owner or admin
  if (req.user.role !== 'admin' && pengajuan.user_id !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  res.json(pengajuan);
};

// @desc    Create a new pengajuan
// @route   POST /api/pengajuan
// @access  Private
export const createPengajuan = async (req, res) => {
  const { jenis_pengajuan_id, owner, lahan, documents } = req.body; // Removed kode_pengajuan from req.body
  try {
    // Generate kode_pengajuan on server side
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const kode_pengajuan = `PJN-${year}${month}${day}-${hours}${minutes}${seconds}`;

    const pengajuan = await Pengajuan.create({
      kode_pengajuan, // Use generated kode_pengajuan
      jenis_pengajuan_id,
      user_id: req.user.id,
    });
    await Owner.create({ ...owner, pengajuan_id: pengajuan.id });
    await Lahan.create({ ...lahan, pengajuan_id: pengajuan.id });
    if (documents && documents.length > 0) {
      const docs = documents.map((d) => ({ ...d, pengajuan_id: pengajuan.id }));
      await Document.bulkCreate(docs);
    }
    res.status(201).json({ message: "Pengajuan created", pengajuan });
  } catch (error) {
    res.status(400).json({ message: "Error creating pengajuan", error: error.message });
  }
};

// @desc    Update a pengajuan
// @route   PUT /api/pengajuan/:id
// @access  Private
export const updatePengajuan = async (req, res) => {
  const { kode_pengajuan, jenis_pengajuan_id, owner, lahan, documents } = req.body; // Use jenis_pengajuan_id
  const pengajuan = await Pengajuan.findOne({ where: { id: req.params.id } });

  if (!pengajuan) {
    return res.status(404).json({ message: "Pengajuan not found" });
  }

  // Check if user is owner or admin
  if (req.user.role !== 'admin' && pengajuan.user_id !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    await pengajuan.update({ kode_pengajuan, jenis_pengajuan_id }); // Use jenis_pengajuan_id

    if (owner) {
      await Owner.update(owner, { where: { pengajuan_id: pengajuan.id } });
    }
    if (lahan) {
      await Lahan.update(lahan, { where: { pengajuan_id: pengajuan.id } });
    }
    if (documents) {
      await Document.destroy({ where: { pengajuan_id: pengajuan.id } });
      if (documents.length > 0) {
          const docs = documents.map((d) => ({ ...d, pengajuan_id: pengajuan.id }));
          await Document.bulkCreate(docs);
      }
    }

    const updatedPengajuan = await Pengajuan.findOne({
      where: { id: req.params.id },
      include: [Owner, Lahan, Document, JenisPengajuan], // Include JenisPengajuan
    });

    res.json({ message: "Pengajuan updated", pengajuan: updatedPengajuan });
  } catch (error) {
    res.status(400).json({ message: "Error updating pengajuan", error: error.message });
  }
};

// @desc    Delete a pengajuan
// @route   DELETE /api/pengajuan/:id
// @access  Private
export const deletePengajuan = async (req, res) => {
  const pengajuan = await Pengajuan.findOne({ where: { id: req.params.id } });

  if (!pengajuan) {
    return res.status(404).json({ message: "Pengajuan not found" });
  }

  // Check if user is owner or admin
  if (req.user.role !== 'admin' && pengajuan.user_id !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    await pengajuan.destroy();
    res.json({ message: "Pengajuan deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting pengajuan", error: error.message });
  }
};
