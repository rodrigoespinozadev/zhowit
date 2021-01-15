'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
   return queryInterface.addColumn('Users', 'ciudad', {
      allowNull: true,
      type: Sequelize.DataTypes.STRING,
      defaultValue: null,
      after: 'country'
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Users', 'ciudad')
  }
};
