import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import JenisPengajuan from "./JenisPengajuan.js"; // Import JenisPengajuan model

const Persyaratan = sequelize.define(
  "Persyaratan",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nama_dokument: { type: DataTypes.STRING, allowNull: false },
    jenis_pengajuan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'jenis_pengajuan', // This is the table name
        key: 'id',
      },
    },
    wajib: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    timestamps: false,
    tableName: 'persyaratan' // Explicitly set table name
  }
);

// Association
Persyaratan.belongsTo(JenisPengajuan, { foreignKey: "jenis_pengajuan_id" });
JenisPengajuan.hasMany(Persyaratan, { foreignKey: "jenis_pengajuan_id" });

export default Persyaratan;
