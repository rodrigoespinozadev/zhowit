'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
   return queryInterface.addColumn('PostFiles', 'filename', {
      allowNull: true,
      type: Sequelize.DataTypes.STRING,
      defaultValue: null,
      after: 'type'
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('PostFiles', 'filename')
  }
};
