const express = require('express');
const app = express();
const healthCheckRoutes = require('./routes/healthCheckRoutes');
const HealthCheck = require('./models/healthCheck'); 

// Middleware to prevent caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

HealthCheck.sync().then(() => {
    console.log('HealthCheck table created!');
  }).catch(err => console.error('Error syncing database:', err));
  

// Use health check routes
app.use(healthCheckRoutes);

// Start the server
app.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});
