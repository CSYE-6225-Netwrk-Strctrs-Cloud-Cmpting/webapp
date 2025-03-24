const {HealthCheck} = require('../models');

const healthCheckController = async (req, res) => {
  try {
    // Check if request has any payload in the body
    if (req.body && Object.keys(req.body).length > 0) {
      return res.status(400).send(); // Send 400 Bad Request if request contains any body payload
    }

    // Check if request has any query parameters
    if (Object.keys(req.query).length > 0) {
      return res.status(400).send(); // Send 400 Bad Request if query parameters exist
    }

    // Insert a new health check record
    await HealthCheck.create({ datetime: new Date() });

    // Return 200 OK if record is inserted successfully
    res.status(200).send();
  } catch (error) {
    console.error(error);

    // Return 503 Service Unavailable if insert command fails
    res.status(503).send();
  }
};

module.exports = healthCheckController;