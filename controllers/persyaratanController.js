import Persyaratan from "../models/Persyaratan.js";
import JenisPengajuan from "../models/JenisPengajuan.js"; // Import JenisPengajuan for includes

// @desc    Create a new persyaratan
// @route   POST /api/persyaratan
// @access  Private, Admin
export const createPersyaratan = async (req, res) => {
  const { nama_dokument, jenis_pengajuan_id } = req.body;
  try {
    const persyaratan = await Persyaratan.create({ nama_dokument, jenis_pengajuan_id });
    res.status(201).json(persyaratan);
  } catch (error) {
    res.status(400).json({ message: "Error creating persyaratan", error: error.message });
  }
};

// @desc    Get all persyaratan (optional: filter by jenis_pengajuan_id)
// @route   GET /api/persyaratan
// @access  Private
export const getAllPersyaratan = async (req, res) => {
  const { jenis_pengajuan_id } = req.query;
  const where = jenis_pengajuan_id ? { jenis_pengajuan_id } : {};
  try {
    const persyaratan = await Persyaratan.findAll({
      where,
      include: [JenisPengajuan],
    });
    res.status(200).json(persyaratan);
  } catch (error) {
    res.status(500).json({ message: "Error fetching persyaratan", error: error.message });
  }
};

// @desc    Get a persyaratan by ID
// @route   GET /api/persyaratan/:id
// @access  Private
export const getPersyaratanById = async (req, res) => {
  try {
    const persyaratan = await Persyaratan.findOne({
      where: { id: req.params.id },
      include: [JenisPengajuan],
    });
    if (!persyaratan) {
      return res.status(404).json({ message: "Persyaratan not found" });
    }
    res.status(200).json(persyaratan);
  } catch (error) {
    res.status(500).json({ message: "Error fetching persyaratan", error: error.message });
  }
};

// @desc    Update a persyaratan
// @route   PUT /api/persyaratan/:id
// @access  Private, Admin
export const updatePersyaratan = async (req, res) => {
  const { nama_dokument, jenis_pengajuan_id } = req.body;
  try {
    const persyaratan = await Persyaratan.findOne({ where: { id: req.params.id } });
    if (!persyaratan) {
      return res.status(404).json({ message: "Persyaratan not found" });
    }
    await persyaratan.update({ nama_dokument, jenis_pengajuan_id });
    res.status(200).json({ message: "Persyaratan updated", persyaratan });
  } catch (error) {
    res.status(400).json({ message: "Error updating persyaratan", error: error.message });
  }
};

// @desc    Delete a persyaratan
// @route   DELETE /api/persyaratan/:id
// @access  Private, Admin
export const deletePersyaratan = async (req, res) => {
  try {
    const persyaratan = await Persyaratan.findOne({ where: { id: req.params.id } });
    if (!persyaratan) {
      return res.status(404).json({ message: "Persyaratan not found" });
    }
    await persyaratan.destroy();
    res.status(200).json({ message: "Persyaratan deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting persyaratan", error: error.message });
  }
};
