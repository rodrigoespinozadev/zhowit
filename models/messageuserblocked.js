'use strict';
module.exports = (sequelize, DataTypes) => {
  var MessageUserBlocked = sequelize.define('MessageUserBlocked');

  MessageUserBlocked.associate = function(models) {
    MessageUserBlocked.belongsTo(models.User, {
      as: 'blocker',
      foreignKey: {
        primaryKey: true
      },
      onDelete: 'CASCADE'
    });

    MessageUserBlocked.belongsTo(models.User, {
      as: 'blocked',
      foreignKey: {
        primaryKey: true
      },
      onDelete: 'CASCADE'
    });
  };

  MessageUserBlocked.removeAttribute('id');

  return MessageUserBlocked;
};