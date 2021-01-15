'use strict';
module.exports = (sequelize, DataTypes) => {
  var PostFile = sequelize.define('PostFile', {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED
    },
    type: DataTypes.ENUM('PHOTO', 'VIDEO', 'PDF', 'FILE'),
    filename: {
      allowNull: true,
      type: DataTypes.STRING
    },
    url: {
      allowNull: false,
      type: DataTypes.STRING
    }
  }, { paranoid: true });

  PostFile.associate = function(models) {
    PostFile.belongsTo(models.Post, {
      as: 'post',
      foreignKey: {
        allowNull: false
      }
    });

    PostFile.hasMany(models.Reaction, {
      foreignKey: 'objectTypeId',
      as: 'reaction',
      constraints: false,
      scope: {
        objectType: 'postfile'
      }
    });
  };
  
  return PostFile;
};