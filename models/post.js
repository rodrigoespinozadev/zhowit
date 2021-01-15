'use strict';
module.exports = (sequelize, DataTypes) => {
  var Post = sequelize.define('Post', {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED
    },
    title: {
      allowNull: false,
      type: DataTypes.STRING
    },
    description: DataTypes.TEXT,
    shareCount: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER.UNSIGNED
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
    commentsCount: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER.UNSIGNED
    },
    shareId: {
      allowNull: true,
      type: DataTypes.BIGINT.UNSIGNED
    },
    reacted: DataTypes.VIRTUAL,
    reaction: DataTypes.VIRTUAL,
    saved: DataTypes.VIRTUAL,
    commented: DataTypes.VIRTUAL,
    commentsItems: DataTypes.VIRTUAL,
    isOwner: DataTypes.VIRTUAL,
    sharedPost: DataTypes.VIRTUAL
  }, { paranoid: true });

  Post.prototype.getLikes = postId => {
    sequelize.models.Reactions.findAll({
      where: {
        objectType: 'post',
        objectTypeId: postId
      }
    });
  };

  Post.associate = function(models) {
    Post.belongsTo(models.User, {
      as: 'user',
      foreignKey: {
        allowNull: false
      },
      onDelete: 'CASCADE'
    });

    Post.belongsTo(models.Category, {
      as: 'category',
      foreignKey: {
        allowNull: false
      },
      onDelete: 'CASCADE'
    });

    Post.hasMany(models.PostFile, {
      as: 'files',
      foreignKey: {
        name: 'postId',
        allowNull: false
      },
      onDelete: 'CASCADE'
    });

    Post.hasMany(models.Comment, {
      as: 'comments',
      foreignKey: {
        name: 'postId',
        allowNull: false
      },
      onDelete: 'CASCADE'
    });

    Post.hasMany(models.Reaction, {
      as: 'reactions',
      foreignKey: 'objectTypeId',
      constraints: false,
      scope: {
        objectType: 'post'
      }
    });

    Post.belongsToMany(models.User, {
      as: 'userSaved',
      foreignKey: {
        name: 'postId',
        primaryKey: true
      },
      through: 'PostSaved'
    });
  };

  return Post;
};