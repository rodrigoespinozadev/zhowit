'use strict';
module.exports = (sequelize, DataTypes) => {
  var CategoryTr = sequelize.define('CategoryTr', {
    langCode: {
      primaryKey: true,
      type: DataTypes.STRING
    },
    name:{
      allowNull: false,
      type: DataTypes.STRING
    },
    description: DataTypes.STRING
  });

  return CategoryTr;
};