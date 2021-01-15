'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .changeColumn('Notifications', 'type', {
        type: Sequelize.ENUM('FOLLOWER','MESSAGE','LIKE','DISLIKE','COMMENT','LIKE_POST','LIKE_COMMENT'),
        allowNull: false
      });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface
      .changeColumn('Notifications', 'type', {
        type: Sequelize.ENUM('FOLLOWER','MESSAGE','LIKE','DISLIKE','COMMENT'),
        allowNull: false
      });
  }
};
