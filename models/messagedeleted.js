'use strict';
module.exports = (sequelize, DataTypes) => {
  var MessageDeleted = sequelize.define('MessageDeleted');

  MessageDeleted.associate = function(models) {
    MessageDeleted.belongsTo(models.Message, {
      as: 'message',
      foreignKey: {
        primaryKey: true
      },
      onDelete: 'CASCADE'
    });

    MessageDeleted.belongsTo(models.User, {
      as: 'deleter',
      foreignKey: {
        primaryKey: true
      },
      onDelete: 'CASCADE'
    });
  };

  MessageDeleted.removeAttribute('id');

  return MessageDeleted;
};