import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import transporter from '../config/mailer.js';
import { Op } from 'sequelize'; // Correctly import Op

dotenv.config();

export const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Pengguna dengan email ini sudah terdaftar." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(activationToken).digest('hex');
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hour

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      status: 'pending',
      activation_token: hashedToken,
      activation_token_expires: tokenExpires,
    });

    const activationUrl = `${process.env.FRONTEND_URL}/aktivasi-email/${activationToken}`;

    const mailOptions = {
        from: `"Admin Kelurahan" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Aktivasi Akun Anda',
        html: `
            <h2>Selamat Datang!</h2>
            <p>Terima kasih telah mendaftar. Silakan klik link di bawah ini untuk mengaktifkan akun Anda:</p>
            <a href="${activationUrl}" target="_blank">Aktifkan Akun Saya</a>
            <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
        `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
        message: "Registrasi berhasil. Silakan periksa email Anda untuk aktivasi akun."
    });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server saat registrasi." });
  }
};

export const activateAccount = async (req, res) => {
    const { token } = req.params;

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            where: {
                activation_token: hashedToken,
                activation_token_expires: { [Op.gt]: new Date() } // Correctly use Op.gt
            }
        });

        if (!user) {
            return res.status(400).json({ message: "Token aktivasi tidak valid atau sudah kedaluwarsa." });
        }

        user.status = 'active';
        user.activation_token = null;
        user.activation_token_expires = null;
        await user.save();

        res.json({ message: "Akun berhasil diaktifkan! Anda sekarang bisa login." });

    } catch (error) {
        console.error("Activation Error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server saat aktivasi akun." });
    }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Email atau password salah." });
    }

    if (user.status !== 'active') {
        return res.status(403).json({ message: "Akun Anda belum aktif. Silakan periksa email Anda untuk link aktivasi." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Email atau password salah." });
    }

    const newSessionId = uuidv4();
    await user.update({ current_session_id: newSessionId });

    const token = jwt.sign(
      { id: user.id, role: user.role, sessionId: newSessionId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server saat login." });
  }
};