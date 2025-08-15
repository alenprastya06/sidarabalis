import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Pengajuan from "./Pengajuan.js";

const Owner = sequelize.define(
  "Owner",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nama: { type: DataTypes.STRING, allowNull: false },
    nik: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    jenis_kelamin: { type: DataTypes.ENUM("L", "P") },
    npwp: { type: DataTypes.STRING },
    agama: { type: DataTypes.STRING },
    kewarganegaraan: { type: DataTypes.STRING },
    alamat: { type: DataTypes.TEXT },
    pekerjaan: { type: DataTypes.STRING },
    tanggal_lahir: { type: DataTypes.DATE },
  },
  { timestamps: false, tableName: 'owner' }
);

Owner.belongsTo(Pengajuan, { foreignKey: "pengajuan_id" });
Pengajuan.hasOne(Owner, { foreignKey: "pengajuan_id" });

export default Owner;
