'use strict';
module.exports = (sequelize, DataTypes) => {
  var Language = sequelize.define('Language', {
    langCode: {
      primaryKey: true,
      type: DataTypes.STRING
    },
    name: {
      unique: true,
      allowNull: false,
      type: DataTypes.STRING
    }
  }, { paranoid: true });
  
  return Language;
};