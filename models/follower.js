'use strict';
module.exports = (sequelize, DataTypes) => {
  var Follower = sequelize.define('Follower', {
    followerId: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER.UNSIGNED
    },
    followedId: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER.UNSIGNED
    }
  });

  return Follower;
};