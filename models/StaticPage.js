import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StaticPage = sequelize.define('StaticPage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  page: {
    type: DataTypes.ENUM('about', 'contact', 'newsletter', 'book-session', 'tools'),
    unique: true,
    allowNull: false,
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false,
  },
});

export default StaticPage;