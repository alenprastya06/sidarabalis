import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM("admin", "user"), defaultValue: "user" },
    status: { type: DataTypes.ENUM('pending', 'active'), defaultValue: 'pending' },
    activation_token: { type: DataTypes.STRING, allowNull: true },
    activation_token_expires: { type: DataTypes.DATE, allowNull: true },
    current_session_id: { type: DataTypes.STRING, allowNull: true }, // New field
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    tableName: 'users'
  }
);

export default User;