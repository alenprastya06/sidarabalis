import Pengajuan from "../models/Pengajuan.js";
import Owner from "../models/Owner.js";
import Lahan from "../models/Lahan.js";
import Document from "../models/Document.js";
import JenisPengajuan from "../models/JenisPengajuan.js";
import Persyaratan from "../models/Persyaratan.js"; // Import Persyaratan model

// Helper function to update Pengajuan status based on its documents
const updatePengajuanStatus = async (pengajuanId) => {
  const documents = await Document.findAll({ where: { pengajuan_id: pengajuanId } });

  let allApproved = true;
  let anyRejected = false;

  for (const doc of documents) {
    if (doc.status === 'rejected') {
      anyRejected = true;
      break;
    }
    if (doc.status === 'pending') {
      allApproved = false;
    }
  }

  let newPengajuanStatus = 'pending';
  if (anyRejected) {
    newPengajuanStatus = 'rejected';
  } else if (allApproved) {
    newPengajuanStatus = 'approved';
  }

  const pengajuan = await Pengajuan.findByPk(pengajuanId);
  if (pengajuan && pengajuan.status !== newPengajuanStatus) {
    await pengajuan.update({ status: newPengajuanStatus });
  }
};

// @desc    Get all pengajuan for a user or all for admin, grouped by user_id
// @route   GET /api/pengajuan
// @access  Private
export const getAllPengajuan = async (req, res) => {
  let whereClause = {};
  if (req.user.role !== 'admin') {
    whereClause = { user_id: req.user.id };
  }
  try {
    const pengajuan = await Pengajuan.findAll({
      where: whereClause,
      include: [Owner, Lahan, Document, JenisPengajuan],
    });

    // Group pengajuan by user_id
    const groupedPengajuan = pengajuan.reduce((acc, currentPengajuan) => {
      const userId = currentPengajuan.user_id;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(currentPengajuan);
      return acc;
    }, {});

    res.json(groupedPengajuan);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pengajuan", error: error.message });
  }
};

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

// @desc    Get a pengajuan by ID
// @route   GET /api/pengajuan/:id
// @access  Private
export const getPengajuanById = async (req, res) => {
  const pengajuan = await Pengajuan.findOne({
    where: { id: req.params.id },
    include: [Owner, Lahan, Document, JenisPengajuan],
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
  const { jenis_pengajuan_id, owner, lahan, documents } = req.body;
  try {
    // Negative case: Check for existing pending pengajuan of the same type for this user
    const existingPendingPengajuan = await Pengajuan.findOne({
      where: {
        user_id: req.user.id,
        jenis_pengajuan_id: jenis_pengajuan_id,
        status: 'pending',
      },
    });

    if (existingPendingPengajuan) {
      return res.status(400).json({
        message: "Anda sudah memiliki pengajuan dengan jenis yang sama yang masih dalam status pending. Harap selesaikan pengajuan sebelumnya atau tunggu hingga statusnya berubah."
      });
    }

    // 1. Validate documents against persyaratan (existing logic)
    const requiredPersyaratan = await Persyaratan.findAll({
      where: { jenis_pengajuan_id },
      attributes: ['nama_dokument'],
    });

    const requiredDocumentNames = requiredPersyaratan.map(p => p.nama_dokument);
    const submittedDocumentTypes = documents ? documents.map(d => d.document_type) : [];

    // Check for missing required documents
    const missingDocuments = requiredDocumentNames.filter(
      docName => !submittedDocumentTypes.includes(docName)
    );
    if (missingDocuments.length > 0) {
      return res.status(400).json({
        message: "Dokumen yang diperlukan tidak lengkap.",
        missing: missingDocuments,
      });
    }

    // Check for unexpected documents (optional, but good practice)
    const unexpectedDocuments = submittedDocumentTypes.filter(
      docType => !requiredDocumentNames.includes(docType)
    );
    if (unexpectedDocuments.length > 0) {
      return res.status(400).json({
        message: "Terdapat dokumen yang tidak diperlukan.",
        unexpected: unexpectedDocuments,
      });
    }

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
      kode_pengajuan,
      jenis_pengajuan_id,
      user_id: req.user.id,
    });
    await Owner.create({ ...owner, pengajuan_id: pengajuan.id });
    await Lahan.create({ ...lahan, pengajuan_id: pengajuan.id });
    if (documents && documents.length > 0) {
      const docs = documents.map((d) => ({ ...d, pengajuan_id: pengajuan.id }));
      await Document.bulkCreate(docs);
    }
    res.status(201).json({ message: "Pengajuan berhasil dibuat", pengajuan }); // Changed success message
  } catch (error) {
    res.status(400).json({ message: "Terjadi kesalahan saat membuat pengajuan", error: error.message }); // Changed error message
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

// @desc    Update document status (admin only)
// @route   PUT /api/pengajuan/documents/:id/status
// @access  Private, Admin
export const updateDocumentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, admin_note } = req.body; // Get admin_note from body

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "Invalid status provided. Must be 'approved' or 'rejected'." });
  }

  try {
    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    await document.update({ status, admin_note }); // Update with admin_note

    // Update parent pengajuan status
    await updatePengajuanStatus(document.pengajuan_id);

    res.json({ message: "Document status updated", document }); // Response already includes the updated document
  } catch (error) {
    res.status(400).json({ message: "Error updating document status", error: error.message });
  }
};
