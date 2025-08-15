import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Pengajuan from "./Pengajuan.js";

const Document = sequelize.define(
  "Document",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    document_type: { type: DataTypes.STRING },
    file_url: { type: DataTypes.TEXT },
    original_name: { type: DataTypes.STRING },
    mime_type: { type: DataTypes.STRING },
    file_size: { type: DataTypes.INTEGER },
    user_note: { type: DataTypes.TEXT },
  },
  { timestamps: false, tableName: 'documents' }
);

Document.belongsTo(Pengajuan, { foreignKey: "pengajuan_id" });
Pengajuan.hasMany(Document, { foreignKey: "pengajuan_id" });

export default Document;
