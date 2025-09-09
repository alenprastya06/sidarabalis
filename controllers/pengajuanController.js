import Pengajuan from "../models/Pengajuan.js";
import Owner from "../models/Owner.js";
import Lahan from "../models/Lahan.js";
import Document from "../models/Document.js";
import User from "../models/User.js";
import JenisPengajuan from "../models/JenisPengajuan.js";
import Persyaratan from "../models/Persyaratan.js";
import puppeteer from "puppeteer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { Readable } from "stream";

const updatePengajuanStatus = async (pengajuanId) => {
  const documents = await Document.findAll({
    where: { pengajuan_id: pengajuanId },
  });

  let allApproved = true;
  let anyRejected = false;

  for (const doc of documents) {
    if (doc.status === "rejected") {
      anyRejected = true;
      break;
    }
    if (doc.status === "pending") {
      allApproved = false;
    }
  }

  const pengajuan = await Pengajuan.findByPk(pengajuanId);
  if (!pengajuan || pengajuan.status === "completed") return; // Do not change status if completed

  let newPengajuanStatus = "pending";
  if (anyRejected) {
    newPengajuanStatus = "menunggu_perbaikan";
  } else if (allApproved) {
    newPengajuanStatus = "approved";
  }

  if (pengajuan.status !== newPengajuanStatus) {
    await pengajuan.update({ status: newPengajuanStatus });
  }
};

export const getAllPengajuan = async (req, res) => {
  let whereClause = {};
  if (req.user.role !== "admin") {
    whereClause = { user_id: req.user.id };
  }

  try {
    const pengajuanList = await Pengajuan.findAll({
      where: whereClause,
      include: [User, Owner, Lahan, Document, JenisPengajuan],
    });

    const groupedByUser = pengajuanList.reduce((acc, pengajuan) => {
      const user = pengajuan.User?.get({ plain: true });
      if (!user) return acc;

      let existingUser = acc.find((u) => u.id === user.id);
      if (!existingUser) {
        existingUser = { ...user, pengajuan: [] };
        acc.push(existingUser);
      }

      const plainPengajuan = pengajuan.get({ plain: true });
      plainPengajuan.id_pengajuan = plainPengajuan.id;
      delete plainPengajuan.id;
      delete plainPengajuan.User;

      existingUser.pengajuan.push(plainPengajuan);
      return acc;
    }, []);

    res.json(groupedByUser);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching pengajuan",
      error: error.message,
    });
  }
};

export const getPengajuanUser = async (req, res) => {
  const pengajuan = await Pengajuan.findAll({
    where: { user_id: req.user.id },
    include: [Owner, Lahan, Document, JenisPengajuan],
  });
  res.json(pengajuan);
};

export const getPengajuanById = async (req, res) => {
  const pengajuan = await Pengajuan.findOne({
    where: { id: req.params.id },
    include: [Owner, Lahan, Document, JenisPengajuan],
  });

  if (!pengajuan) {
    return res.status(404).json({ message: "Pengajuan not found" });
  }

  if (req.user.role !== "admin" && pengajuan.user_id !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  res.json(pengajuan);
};

export const createPengajuan = async (req, res) => {
  const { jenis_pengajuan_id, owner, lahan, documents } = req.body;
  const { tanggal_surat_rt, nib } = lahan || {};
  try {
    const existingPengajuan = await Pengajuan.findOne({
      where: {
        user_id: req.user.id,
        jenis_pengajuan_id: jenis_pengajuan_id,
        status: { [Op.in]: ["pending", "menunggu_perbaikan"] },
      },
    });

    if (existingPengajuan) {
      return res.status(400).json({
        message:
          "Anda sudah memiliki pengajuan dengan jenis yang sama yang masih dalam status pending atau menunggu perbaikan. Harap selesaikan pengajuan sebelumnya atau tunggu hingga statusnya berubah.",
      });
    }

    const allPersyaratan = await Persyaratan.findAll({
      where: { jenis_pengajuan_id },
      attributes: ["nama_dokument", "wajib"],
    });

    // Filter for mandatory documents only
    const mandatoryPersyaratan = allPersyaratan.filter((p) => p.wajib);

    const requiredDocumentNames = mandatoryPersyaratan.map(
      (p) => p.nama_dokument
    );
    const submittedDocumentTypes = documents
      ? documents.map((d) => d.document_type)
      : [];

    const missingDocuments = requiredDocumentNames.filter(
      (docName) => !submittedDocumentTypes.includes(docName)
    );
    if (missingDocuments.length > 0) {
      return res.status(400).json({
        message: "Dokumen wajib tidak lengkap.",
        missing: missingDocuments,
      });
    }

    // Check for unexpected documents against ALL possible persyaratan
    const allPossibleDocumentNames = allPersyaratan.map((p) => p.nama_dokument);
    const unexpectedDocuments = submittedDocumentTypes.filter(
      (docType) => !allPossibleDocumentNames.includes(docType)
    );
    if (unexpectedDocuments.length > 0) {
      return res.status(400).json({
        message: "Terdapat dokumen yang tidak diperlukan.",
        unexpected: unexpectedDocuments,
      });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
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
    res.status(201).json({ message: "Pengajuan berhasil dibuat", pengajuan });
  } catch (error) {
    res.status(400).json({
      message: "Terjadi kesalahan saat membuat pengajuan",
      error: error.message,
    });
  }
};

export const updatePengajuan = async (req, res) => {
  const { kode_pengajuan, jenis_pengajuan_id, owner, lahan, documents } =
    req.body;
  const { tanggal_surat_rt, nib } = lahan || {};
  const pengajuan = await Pengajuan.findOne({ where: { id: req.params.id } });

  if (!pengajuan) {
    return res.status(404).json({ message: "Pengajuan not found" });
  }

  if (req.user.role !== "admin" && pengajuan.user_id !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    await pengajuan.update({ kode_pengajuan, jenis_pengajuan_id });

    if (owner) {
      await Owner.update(owner, { where: { pengajuan_id: pengajuan.id } });
    }
    if (lahan) {
      await Lahan.update(lahan, { where: { pengajuan_id: pengajuan.id } });
    }
    if (documents) {
      await Document.destroy({ where: { pengajuan_id: pengajuan.id } });
      if (documents.length > 0) {
        const docs = documents.map((d) => ({
          ...d,
          pengajuan_id: pengajuan.id,
          status: "pending", // Force status to pending on update
          admin_note: null, // Clear previous rejection notes
        }));
        await Document.bulkCreate(docs);
      }
    }

    // Set the parent submission status back to pending for re-review
    await pengajuan.update({ status: "pending" });

    const updatedPengajuan = await Pengajuan.findOne({
      where: { id: req.params.id },
      include: [Owner, Lahan, Document, JenisPengajuan],
    });

    res.json({ message: "Pengajuan updated", pengajuan: updatedPengajuan });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating pengajuan", error: error.message });
  }
};

export const deletePengajuan = async (req, res) => {
  const pengajuan = await Pengajuan.findOne({ where: { id: req.params.id } });

  if (!pengajuan) {
    return res.status(404).json({ message: "Pengajuan not found" });
  }

  if (req.user.role !== "admin" && pengajuan.user_id !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    await pengajuan.destroy();
    res.json({ message: "Pengajuan deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting pengajuan", error: error.message });
  }
};

export const updateDocumentStatus = async (req, res) => {
  const { id } = req.params;
  const { status, admin_note } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status provided. Must be 'approved' or 'rejected'.",
    });
  }

  try {
    const document = await Document.findByPk(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    await document.update({ status, admin_note });

    await updatePengajuanStatus(document.pengajuan_id);

    res.json({ message: "Document status updated", document });
  } catch (error) {
    res.status(400).json({
      message: "Error updating document status",
      error: error.message,
    });
  }
};

export const rejectPengajuan = async (req, res) => {
  const { id } = req.params;
  const { admin_note } = req.body;

  try {
    const pengajuan = await Pengajuan.findByPk(id);
    if (!pengajuan) {
      return res.status(404).json({ message: "Pengajuan not found" });
    }

    await pengajuan.update({
      status: "rejected",
      admin_note: admin_note || "Pengajuan ditolak oleh admin.",
    });

    res.json({ message: "Pengajuan telah ditolak", pengajuan });
  } catch (error) {
    res.status(400).json({
      message: "Error rejecting pengajuan",
      error: error.message,
    });
  }
};

export const getGeneratedDrafts = async (req, res) => {
  try {
    const drafts = await Pengajuan.findAll({
      where: {
        draft_document_url: { [Op.ne]: null },
        final_document_url: { [Op.is]: null },
        status: "approved",
      },
      include: [User, Owner, Lahan, JenisPengajuan],
    });
    res.json(drafts);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching generated drafts",
      error: error.message,
    });
  }
};

export const getCompletedDocuments = async (req, res) => {
  try {
    const completed = await Pengajuan.findAll({
      where: {
        user_id: req.user.id,
        final_document_url: { [Op.ne]: null },
        status: "completed",
      },
      include: [JenisPengajuan],
      order: [["updatedAt", "DESC"]],
    });
    res.json(completed);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching completed documents",
      error: error.message,
    });
  }
};

export const getNeedsRevision = async (req, res) => {
  try {
    const needsRevision = await Pengajuan.findAll({
      where: {
        user_id: req.user.id,
        status: "menunggu_perbaikan",
      },
      include: [JenisPengajuan, Document], // Menambahkan Document
      order: [["updatedAt", "DESC"]],
    });
    res.json(needsRevision);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching submissions that need revision",
      error: error.message,
    });
  }
};

// --- Document Generation Workflow ---

// Helper function to get and populate template
const getPopulatedHtml = async (pengajuanId, userId, userRole) => {
  const pengajuan = await Pengajuan.findOne({
    where: { id: pengajuanId },
    include: [Owner, Lahan, JenisPengajuan],
  });

  if (!pengajuan) {
    throw { status: 404, message: "Pengajuan not found" };
  }

  if (userRole !== "admin") {
    throw { status: 403, message: "Forbidden" };
  }

  if (pengajuan.status !== "approved") {
    throw {
      status: 400,
      message: "Pengajuan status must be 'approved' to prepare a document.",
    };
  }

  const templateName = pengajuan.JenisPengajuan.name;
  const templateFilePath = path.join(
    process.cwd(),
    "templates",
    `${templateName}.html`
  );

  if (!fs.existsSync(templateFilePath)) {
    throw {
      status: 404,
      message: `Template file not found: ${templateName}.html`,
    };
  }

  let htmlContent = fs.readFileSync(templateFilePath, "utf8");

  const formatTanggalLahir = (tanggal) => {
    if (!tanggal) return "";
    const date = new Date(tanggal);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTanggalSekarang = () => {
    return new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const data = {
    letter_number: pengajuan.kode_pengajuan || "",
    recipient_nama_lengkap: pengajuan.Owner?.nama || "",
    recipient_tempat_lahir: pengajuan.Owner?.tempat_lahir || "",
    recipient_tanggal_lahir: formatTanggalLahir(pengajuan.Owner?.tanggal_lahir),
    recipient_jenis_kelamin:
      pengajuan.Owner?.jenis_kelamin === "L"
        ? "Laki-laki"
        : pengajuan.Owner?.jenis_kelamin === "P"
        ? "Perempuan"
        : "",
    recipient_agama: pengajuan.Owner?.agama || "",
    recipient_kewarganegaraan: pengajuan.Owner?.kewarganegaraan || "",
    recipient_no_ktp_sktld: pengajuan.Owner?.nik || "",
    recipient_alamat_lengkap: pengajuan.Owner?.alamat || "",
    recipient_pekerjaan: pengajuan.Owner?.pekerjaan || "",
    kelengkapan_rt: pengajuan.Lahan?.alamat_rt || "",
    kelengkapan_rw: pengajuan.Lahan?.alamat_rw || "",
    kelengkapan_no_surat_pengantar: pengajuan.Lahan?.no_surat_rt || "",
    kelengkapan_tanggal_surat_rt: formatTanggalLahir(
      pengajuan.Lahan?.tanggal_surat_rt
    ),
    kelengkapan_nib: pengajuan.Lahan?.nib || "",
    kelengkapan_tanggal_surat_rt: formatTanggalSekarang(),
    kelengkapan_luas_lahan: pengajuan.Lahan?.luas_lahan || "",
    kelengkapan_alamat_lahan: [
      pengajuan.Lahan?.alamat_rt ? `RT ${pengajuan.Lahan.alamat_rt}` : "",
      pengajuan.Lahan?.alamat_rw ? `RW ${pengajuan.Lahan.alamat_rw}` : "",
      pengajuan.Lahan?.wilayah_kelurahan
        ? `Kel. ${pengajuan.Lahan.wilayah_kelurahan}`
        : "",
      pengajuan.Lahan?.wilayah_kecamatan
        ? `Kec. ${pengajuan.Lahan.wilayah_kecamatan}`
        : "",
      pengajuan.Lahan?.wilayah_kota
        ? `Kota ${pengajuan.Lahan.wilayah_kota}`
        : "",
    ]
      .filter((item) => item !== "")
      .join(", "),
    issue_date: formatTanggalSekarang(),
    approver_name: "NAMA LURAH",
  };

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\\}\}`, "g");
    htmlContent = htmlContent.replace(regex, value || "");
  }

  return { htmlContent, pengajuan };
};

export const prepareDocumentForEditing = async (req, res) => {
  try {
    const { htmlContent } = await getPopulatedHtml(
      req.params.id,
      req.user.id,
      req.user.role
    );
    res.json({ htmlContent });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "An internal error occurred." });
  }
};

export const generateEditedDocument = async (req, res) => {
  const { id } = req.params;
  const { editedHtml } = req.body;

  if (!editedHtml) {
    return res.status(400).json({ message: "editedHtml content is required." });
  }

  try {
    const pengajuan = await Pengajuan.findByPk(id);
    if (!pengajuan) {
      return res.status(404).json({ message: "Pengajuan not found" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (pengajuan.final_document_url) {
      return res.status(400).json({
        message:
          "Dokumen final sudah pernah dikirim. Tidak dapat membuat draf baru.",
      });
    }

    let browser;
    let pdfBuffer;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(editedHtml, { waitUntil: "load", timeout: 60000 });
      pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    } catch (puppeteerError) {
      console.error("Error generating PDF with Puppeteer:", puppeteerError);
      return res.status(500).json({ message: "Error generating PDF" });
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    try {
      const formData = new FormData();
      const filename = `${pengajuan.kode_pengajuan}_draft.pdf`;
      const bufferStream = new Readable();
      bufferStream.push(pdfBuffer);
      bufferStream.push(null);

      formData.append("file", bufferStream, {
        filename: filename,
        contentType: "application/pdf",
        knownLength: pdfBuffer.length,
      });

      const uploadResponse = await axios.post(
        "https://invitations.my.id/api/upload-file",
        formData,
        { headers: { ...formData.getHeaders() } }
      );

      if (uploadResponse.data && uploadResponse.data.status === 200) {
        const pdfUrl = uploadResponse.data.data?.path;
        if (pdfUrl) {
          await pengajuan.update({ draft_document_url: pdfUrl });
          return res.json({
            message: "Draft document generated successfully. Please review.",
            draft_document_url: pdfUrl,
          });
        }
      }
      throw new Error("Failed to upload PDF or get URL.");
    } catch (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      return res.status(500).json({ message: "Error uploading draft PDF." });
    }
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "An internal error occurred." });
  }
};

export const sendDocumentToUser = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const pengajuan = await Pengajuan.findByPk(id);
    if (!pengajuan) {
      return res.status(404).json({ message: "Pengajuan not found" });
    }

    if (pengajuan.final_document_url) {
      return res.status(400).json({
        message: "Dokumen final untuk pengajuan ini sudah pernah dikirim.",
      });
    }

    if (!pengajuan.draft_document_url) {
      return res
        .status(400)
        .json({ message: "No draft document found to send." });
    }

    await pengajuan.update({
      final_document_url: pengajuan.draft_document_url,
      draft_document_url: null,
      status: "completed",
    });

    res.json({
      message: "Dokumen telah berhasil dikirim ke pengguna.",
      final_document_url: pengajuan.final_document_url,
    });
  } catch (error) {
    res.status(500).json({ message: "An internal error occurred." });
  }
};
