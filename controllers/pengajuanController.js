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

  let newPengajuanStatus = "pending";
  if (anyRejected) {
    newPengajuanStatus = "rejected";
  } else if (allApproved) {
    newPengajuanStatus = "approved";
  }

  const pengajuan = await Pengajuan.findByPk(pengajuanId);
  if (pengajuan && pengajuan.status !== newPengajuanStatus) {
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

    // Group by user, tapi sertakan data user
    const groupedByUser = pengajuanList.reduce((acc, pengajuan) => {
      const user = pengajuan.User?.get({ plain: true });
      if (!user) return acc; // skip jika tidak ada user

      let existingUser = acc.find((u) => u.id === user.id);
      if (!existingUser) {
        existingUser = { ...user, pengajuan: [] };
        acc.push(existingUser);
      }

      const plainPengajuan = pengajuan.get({ plain: true });
      plainPengajuan.id_pengajuan = plainPengajuan.id;
      delete plainPengajuan.id;
      delete plainPengajuan.User; // hapus duplikasi user di dalam pengajuan

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
  try {
    const existingPendingPengajuan = await Pengajuan.findOne({
      where: {
        user_id: req.user.id,
        jenis_pengajuan_id: jenis_pengajuan_id,
        status: "pending",
      },
    });

    if (existingPendingPengajuan) {
      return res.status(400).json({
        message:
          "Anda sudah memiliki pengajuan dengan jenis yang sama yang masih dalam status pending. Harap selesaikan pengajuan sebelumnya atau tunggu hingga statusnya berubah.",
      });
    }

    const requiredPersyaratan = await Persyaratan.findAll({
      where: { jenis_pengajuan_id },
      attributes: ["nama_dokument"],
    });

    const requiredDocumentNames = requiredPersyaratan.map(
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
        message: "Dokumen yang diperlukan tidak lengkap.",
        missing: missingDocuments,
      });
    }

    const unexpectedDocuments = submittedDocumentTypes.filter(
      (docType) => !requiredDocumentNames.includes(docType)
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
        }));
        await Document.bulkCreate(docs);
      }
    }

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

import { Readable } from "stream";

// Bagian yang diperbaiki dari fungsi generatePdfDocument
export const generatePdfDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const pengajuan = await Pengajuan.findOne({
      where: { id },
      include: [Owner, Lahan, JenisPengajuan],
    });

    if (!pengajuan) {
      return res.status(404).json({ message: "Pengajuan not found" });
    }

    if (req.user.role !== "admin" && pengajuan.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (pengajuan.status !== "approved") {
      return res.status(400).json({
        message: "Pengajuan status must be 'approved' to generate PDF.",
      });
    }

    const templateName = pengajuan.JenisPengajuan.name;
    const templateFilePath = path.join(
      process.cwd(),
      "templates",
      `${templateName}.html`
    );

    if (!fs.existsSync(templateFilePath)) {
      return res.status(404).json({
        message: `Template file not found: ${templateName}.html`,
      });
    }

    let htmlContent;
    try {
      htmlContent = fs.readFileSync(templateFilePath, "utf8");

      // Format tanggal lahir dengan benar
      const formatTanggalLahir = (tanggal) => {
        if (!tanggal) return "";
        const date = new Date(tanggal);
        return date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
      };

      // Format tanggal hari ini
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
        recipient_tempat_lahir: pengajuan.Owner?.tempat_lahir || "", // Pastikan field ini ada di model Owner
        recipient_tanggal_lahir: formatTanggalLahir(
          pengajuan.Owner?.tanggal_lahir
        ),
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
        kelengkapan_tanggal_surat_pengantar: formatTanggalSekarang(),
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
        approver_name: "NAMA LURAH", // Ganti dengan data dinamis jika ada
      };

      // PERBAIKAN UTAMA: Regex pattern yang benar untuk mengganti placeholder
      for (const [key, value] of Object.entries(data)) {
        // Pattern lama yang salah: \\{\\{${key}\\\\}\}
        // Pattern baru yang benar: \\{\\{${key}\\}\\}
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
        htmlContent = htmlContent.replace(regex, value || "");
      }

      // Debug: Log untuk melihat apakah replacement berhasil
      console.log("Data yang akan di-replace:", data);
      console.log(
        "Apakah masih ada placeholder yang tersisa?",
        htmlContent.includes("{{") ? "YA" : "TIDAK"
      );
    } catch (readError) {
      console.error("Error reading template file:", readError);
      return res.status(500).json({
        message: "Error reading or processing template file",
        error: readError.message,
      });
    }

    // Generate PDF using Puppeteer
    let browser;
    let pdfBuffer;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });
      pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
      });
    } catch (puppeteerError) {
      console.error("Error generating PDF with Puppeteer:", puppeteerError);
      return res.status(500).json({
        message: "Error generating PDF",
        error: puppeteerError.message,
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    // Upload PDF to external service
    try {
      const formData = new FormData();
      const filename = `${pengajuan.kode_pengajuan}.pdf`;

      // Convert Buffer to Stream to fix "source.on is not a function" error
      const bufferStream = new Readable();
      bufferStream.push(pdfBuffer);
      bufferStream.push(null); // End the stream

      formData.append("file", bufferStream, {
        filename: filename,
        contentType: "application/pdf",
        knownLength: pdfBuffer.length,
      });

      console.log(`Uploading PDF: ${filename}`);

      const uploadResponse = await axios.post(
        "https://invitations.my.id/api/upload-file",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 30000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      console.log("Upload response:", uploadResponse.data);

      if (uploadResponse.data && uploadResponse.data.status === 200) {
        const pdfUrl = uploadResponse.data.data?.path;

        if (pdfUrl) {
          return res.status(200).json({
            message: "PDF generated and uploaded successfully",
            pdf_url: pdfUrl,
            kode_pengajuan: pengajuan.kode_pengajuan,
            filename: filename,
          });
        } else {
          console.error("PDF URL not found in response:", uploadResponse.data);
          return res.status(500).json({
            message: "PDF uploaded but URL not found in response",
            upload_response: uploadResponse.data,
          });
        }
      } else {
        console.error("Upload failed with response:", uploadResponse.data);
        return res.status(500).json({
          message: "Failed to upload PDF",
          upload_response: uploadResponse.data,
        });
      }
    } catch (uploadError) {
      console.error("Error uploading PDF:", uploadError);

      if (uploadError.response) {
        return res.status(500).json({
          message: "Error uploading PDF to external service",
          error: uploadError.response.data || uploadError.message,
          status: uploadError.response.status,
        });
      } else if (uploadError.request) {
        return res.status(500).json({
          message: "Network error when uploading PDF",
          error: "No response received from upload service",
        });
      } else {
        return res.status(500).json({
          message: "Error preparing PDF upload",
          error: uploadError.message,
        });
      }
    }
  } catch (error) {
    console.error("Error in generatePdfDocument:", error);
    return res.status(500).json({
      message: "Internal server error while generating PDF",
      error: error.message,
    });
  }
};
