const express = require("express");
const dotenv = require("dotenv");
const { connectDB } = require("./models");
const healthCheckRoutes = require("./routes/healthCheckRoutes");
const fileRoutes = require("./routes/fileRoutes");

dotenv.config();
const app = express();
app.use(express.json());

// Connect to the database
connectDB();

// Register API Routes with correct paths matching Swagger
app.use("/", healthCheckRoutes);
app.use("/v1/file", fileRoutes); // Changed from "/api/files" to "/v1/file" per Swagger

// Error Handling for Invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    console.error("Invalid JSON received:", err.message);
    return res.status(400).json({ error: "Invalid JSON format" });
  }
  next();
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;