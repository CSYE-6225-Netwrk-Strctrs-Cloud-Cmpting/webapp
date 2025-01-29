const HealthCheck = require('../models/healthCheck');

const healthCheckController = async (req, res) => {
  if (req.method === 'GET') {
    try {
      // Insert a new health check record
      await HealthCheck.create({ datetime: new Date() });

      // Send 200 OK response with no content
      res.status(200).send();
    } catch (error) {
      console.error(error);
      // Send 503 Service Unavailable if an error occurs
      res.status(503).send();
    }
  } else {
    // If the method is not GET, send 405 Method Not Allowed
    res.status(405).send();
  }
};

module.exports = healthCheckController;
