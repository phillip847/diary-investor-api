import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Article = sequelize.define('Article', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subtitle: {
    type: DataTypes.TEXT,
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('Namibia', 'South Africa', 'Global Markets', 'Crypto', 'Investing Guides', 'Housing & Personal Finance', 'Business & Entrepreneurship'),
    allowNull: false,
  },
  tags: {
    type: DataTypes.JSON,
  },
  thumbnail: {
    type: DataTypes.STRING,
  },
  thumbnailAlt: {
    type: DataTypes.STRING,
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'published'),
    defaultValue: 'draft',
  },
  publishDate: {
    type: DataTypes.DATE,
  },
});

export default Article;