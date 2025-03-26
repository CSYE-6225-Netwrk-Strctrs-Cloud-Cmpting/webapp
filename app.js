const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const responseTime = require("response-time");
const StatsD = require("hot-shots");

const { connectDB } = require("./models");
const healthCheckRoutes = require("./routes/healthCheckRoutes");
const fileRoutes = require("./routes/fileRoutes");
const logger = require("./logger"); // Make sure path is correct

dotenv.config();
const app = express();
const statsd = new StatsD({ host: "127.0.0.1", port: 8125 });

// Middleware
app.use(helmet()); // Secure headers
app.use(cors());   // Enable CORS if needed
app.use(express.json());

// Connect to the database
connectDB();

// Metrics Middleware - StatsD
app.use(
  responseTime((req, res, time) => {
    const cleanRoute = req.path.replace(/\//g, "_").replace(/_{2,}/g, "_").replace(/^_+|_+$/g, "");
    statsd.increment(`api.${req.method}.${cleanRoute}`);
    statsd.timing(`api.${req.method}.${cleanRoute}.duration`, time);
  })
);

// Logging Middleware - Winston
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    httpRequest: {
      method: req.method,
      url: req.url,
      userAgent: req.get("User-Agent"),
      remoteIp: req.ip,
    },
  });
  next();
});

// API Routes
app.use("/", healthCheckRoutes);
app.use("/v1/file", fileRoutes);

// Error handling for malformed JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.error("Invalid JSON received:", err.message);
    return res.status(400).json({ error: "Invalid JSON format" });
  }
  next();
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));

module.exports = app;