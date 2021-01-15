'use strict';
module.exports = (sequelize, DataTypes) => {
  var Comment = sequelize.define('Comment', {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED
    },
    comment: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    likesCount: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER.UNSIGNED
    },
    dislikesCount: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER.UNSIGNED
    },
    reacted: DataTypes.VIRTUAL,
    isOwner: DataTypes.VIRTUAL
  }, { paranoid: true });

  Comment.associate = function(models) {
    Comment.belongsTo(models.User, {
      as: 'user',
      foreignKey: {
        allowNull: false
      },
      onDelete: 'CASCADE'
    });

    Comment.belongsTo(models.Post, {
      as: 'post',
      foreignKey: {
        allowNull: false
      },
      onDelete: 'CASCADE'
    });
    
    Comment.hasMany(models.Reaction, {
      foreignKey: 'objectTypeId',
      as: 'reaction',
      constraints: false,
      scope: {
        objectType: 'comment'
      }
    });
  };

  return Comment;
};