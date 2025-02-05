const HealthCheck = require('../models/healthCheck');

const healthCheckController = async (req, res) => {
  // Step 6: Allow only GET method
  if (req.method === 'GET') {
    try {
      // Step 4: Check if request has any payload in the body
      if (req.body && Object.keys(req.body).length > 0) {
        return res.status(400).send(); // Send 400 Bad Request if request contains any body payload
      }

      // Step 4: Check if request has any query parameters
      if (Object.keys(req.query).length > 0) {
        return res.status(400).send(); // Send 400 Bad Request if query parameters exist
      }

      // Step 1: Insert a new health check record
      await HealthCheck.create({ datetime: new Date() });

      // Step 2: Return 200 OK if record is inserted successfully
      res.status(200).send();
    } catch (error) {
      console.error(error);

      // Step 2: Return 503 Service Unavailable if insert command fails
      res.status(503).send();
    }
  } else {
    // Step 6: Return 405 Method Not Allowed for any method other than GET
    res.status(405).send();
  }
};

module.exports = healthCheckController;
