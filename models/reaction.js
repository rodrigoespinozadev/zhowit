'use strict';
module.exports = (sequelize, DataTypes) => {
  var Reaction = sequelize.define('Reaction', {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED
    },
    type: {
      type: DataTypes.ENUM('like', 'dislike'),
      allowNull: false
    },
    objectType: {
      type: DataTypes.ENUM('post', 'comment', 'photo', 'video'),
      allowNull: false
    },
    objectTypeId: {
      allowNull: false,
      type: DataTypes.BIGINT.UNSIGNED
    }
  });

  Reaction.prototype.getItem = function(options) {
    return this['get' + this.get('objectType').substr(0, 1).toUpperCase() + this.get('objectType').substr(1)](options);
  };

  Reaction.associate = function(models) {
    Reaction.belongsTo(models.Post, {
      as: 'post',
      foreignKey: 'objectTypeId',
      constraints: false
    });

    Reaction.belongsTo(models.Comment, {
      as: 'comment',
      foreignKey: 'objectTypeId',
      constraints: false
    });

    Reaction.belongsTo(models.User, {
      as: 'user',
      foreignKey: {
        name: 'userId',
        allowNull: false
      },
      onDelete: 'CASCADE'
    });
  };

  return Reaction;
};