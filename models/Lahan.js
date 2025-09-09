import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Pengajuan from "./Pengajuan.js";

const Lahan = sequelize.define(
  "Lahan",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    no_surat_rt: { type: DataTypes.STRING },
    tanggal_surat_rt: { type: DataTypes.DATEONLY },
    nib: { type: DataTypes.STRING },
    jenis_bangunan: { type: DataTypes.STRING },
    luas_lahan: { type: DataTypes.DECIMAL(10, 2) },
    alamat_rt: { type: DataTypes.STRING },
    alamat_rw: { type: DataTypes.STRING },
    kode_pos: { type: DataTypes.STRING },
    wilayah_kelurahan: { type: DataTypes.STRING },
    wilayah_kecamatan: { type: DataTypes.STRING },
    wilayah_kota: { type: DataTypes.STRING },
  },
  { timestamps: false, tableName: 'lahan' }
);

Lahan.belongsTo(Pengajuan, { foreignKey: "pengajuan_id" });
Pengajuan.hasOne(Lahan, { foreignKey: "pengajuan_id" });

export default Lahan;
