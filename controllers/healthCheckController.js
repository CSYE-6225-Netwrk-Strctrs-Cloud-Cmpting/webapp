const { HealthCheck } = require('../models');
const logger = require('../logger');
const StatsD = require('node-statsd');
const statsdClient = new StatsD({ host: 'localhost', port: 8125 });

const healthCheckController = async (req, res) => {
  try {
    if (req.body && Object.keys(req.body).length > 0) {
      logger.warn('Health check received body payload');
      return res.status(400).send();
    }

    if (Object.keys(req.query).length > 0) {
      logger.warn('Health check received query params');
      return res.status(400).send();
    }

    await HealthCheck.create({ datetime: new Date() });
    statsdClient.increment('api.healthz.count');
    logger.info('Health check successful');

    res.status(200).send();
  } catch (error) {
    logger.error(`Health check failed: ${error.stack}`);
    res.status(503).send();
  }
};

module.exports = healthCheckController;
