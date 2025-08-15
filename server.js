import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import sequelize from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import pengajuanRoutes from "./routes/pengajuanRoutes.js";
import jenisPengajuanRoutes from "./routes/jenisPengajuanRoutes.js";
import persyaratanRoutes from "./routes/persyaratanRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/pengajuan", pengajuanRoutes);
app.use("/api/jenis-pengajuan", jenisPengajuanRoutes);
app.use("/api/persyaratan", persyaratanRoutes);

// Gunakan authenticate() instead of sync() untuk production
const startServer = async () => {
  try {
    // Hanya test koneksi database, tidak mengubah schema
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Start server
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
};

startServer();

// ALTERNATIVE 1: Jika masih ingin menggunakan sync, tapi hanya sekali
// const startServer = async () => {
//   try {
//     // Sync hanya jika diperlukan, tanpa alter
//     await sequelize.sync({ force: false, alter: false });
//     console.log('Database synced successfully.');

//     app.listen(process.env.PORT, () => {
//       console.log(`Server running on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error('Database sync failed:', error);
//     process.exit(1);
//   }
// };

// ALTERNATIVE 2: Sync hanya pada environment development
// const startServer = async () => {
//   try {
//     if (process.env.NODE_ENV === 'development') {
//       // Sync hanya di development
//       await sequelize.sync({ force: false, alter: false });
//       console.log('Database synced (development mode).');
//     } else {
//       // Production hanya authenticate
//       await sequelize.authenticate();
//       console.log('Database connection established (production mode).');
//     }

//     app.listen(process.env.PORT, () => {
//       console.log(`Server running on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error('Database operation failed:', error);
//     process.exit(1);
//   }
// };
