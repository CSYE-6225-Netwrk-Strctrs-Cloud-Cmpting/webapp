require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT,
    logging: false,
});

// Define HealthCheck Model
const HealthCheck = sequelize.define("HealthCheck", {
    check_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    datetime: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
}, {
    tableName: "health_checks",
    timestamps: false,
});

// Define File Metadata Model
const File = sequelize.define("File", {
    id: { type: DataTypes.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
    filename: { type: DataTypes.STRING, allowNull: false },
    s3_path: { type: DataTypes.STRING, allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, {
    tableName: "files",
    timestamps: false,
});

// Database connection function
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Database connected successfully!");
        await sequelize.sync();
        console.log("✅ Models synchronized with DB!");
    } catch (error) {
        console.error("❌ Database connection failed:", error);
        process.exit(1);
    }
};

module.exports = { sequelize, HealthCheck, File, connectDB };