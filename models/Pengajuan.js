import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";
import JenisPengajuan from "./JenisPengajuan.js";

const Pengajuan = sequelize.define(
  "Pengajuan",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    kode_pengajuan: { type: DataTypes.STRING, allowNull: false },
    jenis_pengajuan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'jenis_pengajuan', // This is the table name
        key: 'id',
      },
    },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'menunggu_perbaikan', 'completed'), defaultValue: 'pending' }, // New field
    draft_document_url: { type: DataTypes.STRING, allowNull: true },
    final_document_url: { type: DataTypes.STRING, allowNull: true },
    admin_note: { type: DataTypes.TEXT, allowNull: true },
  },
  { timestamps: true, tableName: 'pengajuan' }
);

Pengajuan.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Pengajuan, { foreignKey: "user_id" });

Pengajuan.belongsTo(JenisPengajuan, { foreignKey: "jenis_pengajuan_id" });
JenisPengajuan.hasMany(Pengajuan, { foreignKey: "jenis_pengajuan_id" });

export default Pengajuan;
