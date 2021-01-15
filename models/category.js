'use strict';
module.exports = (sequelize, DataTypes) => {
  var Category = sequelize.define('Category', {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED
    },
    slug: {
      allowNull: false,
      type: DataTypes.STRING
    },
    image: DataTypes.STRING,
    subscribed: DataTypes.VIRTUAL
  }, { paranoid: true });

  Category.associate = function(models) {
    Category.belongsToMany(models.User, {
      as: 'subscription',
      foreignKey: 'categoryId',
      through: 'Interests'
    });

    Category.hasMany(models.CategoryTr, {
      as: 'translations',
      foreignKey: {
        name: 'categoryId',
        primaryKey: true
      },
      onDelete: 'CASCADE'
    });
  };

  return Category;
};