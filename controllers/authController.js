import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import transporter from '../config/mailer.js';
import { Op } from 'sequelize';

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
                activation_token_expires: { [Op.gt]: new Date() } 
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

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });

        // Always send a success response to prevent user enumeration
        if (!user) {
            return res.json({ message: "Jika email Anda terdaftar, sebuah link untuk reset password telah dikirimkan." });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 3600000); // 1 hour

        user.reset_password_token = hashedToken;
        user.reset_password_token_expires = tokenExpires;
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        const mailOptions = {
            from: `"Admin Kelurahan" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Reset Password Akun Anda',
            html: `
                <h2>Lupa Password?</h2>
                <p>Anda menerima email ini karena ada permintaan untuk mereset password akun Anda. Klik link di bawah ini:</p>
                <a href="${resetUrl}" target="_blank">Reset Password</a>
                <p>Link ini akan kedaluwarsa dalam 1 jam. Jika Anda tidak merasa meminta ini, abaikan saja email ini.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ message: "Jika email Anda terdaftar, sebuah link untuk reset password telah dikirimkan." });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};

export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            where: {
                reset_password_token: hashedToken,
                reset_password_token_expires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: "Token reset tidak valid atau sudah kedaluwarsa." });
        }

        // Set new password and clear reset token fields
        user.password = await bcrypt.hash(password, 10);
        user.reset_password_token = null;
        user.reset_password_token_expires = null;
        await user.save();

        res.json({ message: "Password berhasil diubah. Silakan login dengan password baru Anda." });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};