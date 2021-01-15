'use strict';
module.exports = (sequelize, DataTypes) => {
  var Notification = sequelize.define('Notification', {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED
    },
    type: {
      allowNull: false,
      type: DataTypes.ENUM('FOLLOWER','MESSAGE','LIKE','DISLIKE','COMMENT','LIKE_POST','LIKE_COMMENT')
    },
    postId: DataTypes.BIGINT.UNSIGNED,
    is_read: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER
    }
  }, { paranoid: true });

  Notification.associate = function(models) {
    Notification.belongsTo(models.User, {
      as: 'user',
      foreignKey: {
        primaryKey: true
      },
      onDelete: 'CASCADE'
    });

    Notification.belongsTo(models.User, {
      as: 'actor',
      foreignKey: {
        primaryKey: true
      },
      onDelete: 'CASCADE'
    });

    Notification.belongsTo(models.Post, {
      as: 'post',
      foreignKey: 'postId',
      onDelete: 'CASCADE'
    });

     Notification.belongsTo(models.Message, {
      as: 'message',
      foreignKey: 'messageId',
      onDelete: 'CASCADE'
    });
  };

  return Notification;
};