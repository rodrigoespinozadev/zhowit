'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
   return queryInterface.addColumn('Notifications', 'messageId', {
      allowNull: true,
      type: Sequelize.DataTypes.INTEGER,
      defaultValue: null,
      after: 'postId'
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Notifications', 'messageId')
  }
};
