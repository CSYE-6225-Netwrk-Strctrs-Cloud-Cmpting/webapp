const express = require('express');
const app = express();
const healthCheckRoutes = require('./routes/healthCheckRoutes');
const {HealthCheck} = require('./models'); 

// Step 3: Middleware to parse JSON bodies
app.use(express.json());

// Step 3: Middleware to prevent caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

app.use(healthCheckRoutes);

// Step 3: Error handling for invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    // Handle invalid JSON error
    console.error('Invalid JSON received:', err.message);
    return res.status(400).json();
  }
  next();
});

// Sync database
HealthCheck.sync().then(() => {
  console.log('HealthCheck table created!');
}).catch(err => console.error('Error syncing database:', err));

// Start the server
if(process.env.NODE_ENV !== "test"){
  app.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
  });
}


module.exports = app;