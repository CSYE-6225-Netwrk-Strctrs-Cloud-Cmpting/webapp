const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  username: 'postgres',
  password: 'password123',
  database: 'csye6225',
  port: 5432,
});

const HealthCheck = sequelize.define('HealthCheck', {
  // Define columns
  check_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  datetime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW,
  },
}, {
  tableName: 'health_checks',  // Use custom table name
  timestamps: false, // Don't use Sequelize's default timestamps (createdAt, updatedAt)
});

module.exports = {sequelize,HealthCheck};
