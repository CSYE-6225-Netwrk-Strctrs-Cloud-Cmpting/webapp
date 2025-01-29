'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Define table creation logic here
    await queryInterface.createTable('health_checks', {
      check_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      datetime: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Define logic for rolling back migration
    await queryInterface.dropTable('health_checks');
  }
};
