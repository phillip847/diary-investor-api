import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  'diary_investor',
  'root',
  '',
  {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
  }
);

export default sequelize;