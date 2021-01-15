'use strict';
module.exports = (sequelize, DataTypes) => {
  var Message = sequelize.define('Message', {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED
    },
    message: {
      allowNull: false,
      type: DataTypes.STRING
    },
    // viewed: {
    //   allowNull: false,
    //   type: DataTypes.STRING,
    //   defaultValue: false
    // }
  });

  Message.associate = function(models) {
    Message.belongsTo(models.User, {
      as: 'sender',
      foreignKey: {
        allowNull: false
      },
      onDelete: 'CASCADE'
    });

    Message.belongsTo(models.User, {
      as: 'receiver',
      foreignKey: {
        allowNull: false
      },
      onDelete: 'CASCADE'
    });
  };

  return Message;
};