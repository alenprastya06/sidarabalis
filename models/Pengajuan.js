import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";
import JenisPengajuan from "./JenisPengajuan.js"; // Import the new model

const Pengajuan = sequelize.define(
  "Pengajuan",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    kode_pengajuan: { type: DataTypes.STRING, allowNull: false },
    jenis_pengajuan_id: { // New field
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'jenis_pengajuan', // This is the table name
        key: 'id',
      },
    },
  },
  { timestamps: true, tableName: 'pengajuan' }
);

Pengajuan.belongsTo(User, { foreignKey: "user_id" });
User.hasMany(Pengajuan, { foreignKey: "user_id" });

// New association
Pengajuan.belongsTo(JenisPengajuan, { foreignKey: "jenis_pengajuan_id" });
JenisPengajuan.hasMany(Pengajuan, { foreignKey: "jenis_pengajuan_id" });

export default Pengajuan;