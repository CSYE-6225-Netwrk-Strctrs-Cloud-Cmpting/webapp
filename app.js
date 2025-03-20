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

// Register API Routes
app.use("/health", healthCheckRoutes);
app.use("/api/files", fileRoutes);

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