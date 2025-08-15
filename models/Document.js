import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Pengajuan from "./Pengajuan.js";

const Document = sequelize.define(
  "Document",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    document_type: { type: DataTypes.STRING, allowNull: false }, // Required
    file_url: { type: DataTypes.TEXT, allowNull: false }, // Required
    original_name: { type: DataTypes.STRING, allowNull: false }, // Required
    user_note: { type: DataTypes.TEXT, allowNull: true }, // Optional
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
    admin_note: { type: DataTypes.TEXT, allowNull: true }, // New field
  },
  { timestamps: false }
);

Document.belongsTo(Pengajuan, { foreignKey: "pengajuan_id" });
Pengajuan.hasMany(Document, { foreignKey: "pengajuan_id" });

export default Document;