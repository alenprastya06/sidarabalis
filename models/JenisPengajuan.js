import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const JenisPengajuan = sequelize.define(
  "JenisPengajuan",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  {
    timestamps: false,
    tableName: 'jenis_pengajuan' // Explicitly set table name
  }
);

export default JenisPengajuan;
