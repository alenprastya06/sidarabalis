import express from "express";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import pengajuanRoutes from "./routes/pengajuanRoutes.js";
import jenisPengajuanRoutes from "./routes/jenisPengajuanRoutes.js";
import persyaratanRoutes from "./routes/persyaratanRoutes.js";
dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/pengajuan", pengajuanRoutes);
app.use("/api/jenis-pengajuan", jenisPengajuanRoutes);
app.use("/api/persyaratan", persyaratanRoutes);

sequelize.sync({ alter: true }).then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
});
