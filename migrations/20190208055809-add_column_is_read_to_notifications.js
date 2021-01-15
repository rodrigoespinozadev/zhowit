'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
   return queryInterface.addColumn('Notifications', 'is_read', {
      allowNull: false,
      type: Sequelize.DataTypes.INTEGER,
      defaultValue: 0,
      after: 'postId'
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Notifications', 'is_read')
  }
};
