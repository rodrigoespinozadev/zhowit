'use strict';
module.exports = (sequelize, DataTypes) => {
  var User = sequelize.define('User', {
    id: {
      primaryKey: true,
      autoIncrement: true,
      type: DataTypes.BIGINT.UNSIGNED
    },
    username: {
      allowNull: false,
      unique: 'username',
      type: DataTypes.STRING
    },
    email: {
      allowNull: false,
      unique: 'email',
      type: DataTypes.STRING
    },
    profile_url: {
      allowNull: true,
      unique: 'profile_url',
      type: DataTypes.STRING
    },
    nombre: {
      allowNull: false,
      type: DataTypes.STRING
    },
    apellido: {
      allowNull: false,
      type: DataTypes.STRING
    },
    password: {
      allowNull: false,
      type: DataTypes.STRING
    },
    birthdate: {
      allowNull: true,
      type: DataTypes.DATEONLY
    },
    sex: {
      allowNull: true,
      type: DataTypes.ENUM('MA', 'FE')
    },
    ciudad: {
      allowNull: true,
      type: DataTypes.STRING
    },
    country: {
      allowNull: true,
      type: DataTypes.STRING
    },
    biography: DataTypes.TEXT,
    profileImage: {
      defaultValue: 'https://cdn.zhowit.com/users/default/profile.jpg',
      type: DataTypes.STRING
    },
    coverImage: {
      defaultValue: 'https://cdn.zhowit.com/users/default/cover.jpg',
      type: DataTypes.STRING
    },
    type: {
      allowNull: true,
      type: DataTypes.STRING
    },
    facebookId: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    isVerified: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: 0
    },
    acceptTerms: {
      allowNull: false,
      type: DataTypes.BOOLEAN
    },
    langCode: {
      allowNull: false,
      defaultValue: 'en',
      type: DataTypes.STRING
    },
    postsCount: {
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
    followingCount: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER.UNSIGNED
    },
    followersCount: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER.UNSIGNED
    },
    unreadedNotificationsCount: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER.UNSIGNED
    },
    unreadedMessagesCount: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER.UNSIGNED
    },
    following: DataTypes.VIRTUAL,
    isblocked: DataTypes.VIRTUAL,
    lastContact: DataTypes.VIRTUAL,
    fullname: { type: DataTypes.VIRTUAL },
    followersRecentCount: DataTypes.VIRTUAL
  }, { getterMethods: {
    fullname() {
      return this.nombre + ' ' + this.apellido
    }
  },paranoid: true });

  User.associate = function(models) {
    User.belongsToMany(models.Category, {
      foreignKey: {
        name: 'userId',
        primaryKey: true
      },
      through: 'Interests'
    });

    User.belongsToMany(models.Post, {
      as: 'postSaved',
      foreignKey: {
        name: 'userId',
        primaryKey: true
      },
      through: 'PostSaved'
    });

    User.belongsToMany(models.User, {
      as: 'followed',
      foreignKey: {
        name: 'followerId',
        primaryKey: true
      },
      through: 'Followers'
    });

    User.belongsToMany(models.User, {
      as: 'follower',
      foreignKey: {
        name: 'followedId',
        primaryKey: true
      },
      through: 'Followers'
    });
    
    User.belongsToMany(models.User, {
      as: 'blocked',
      foreignKey: {
        name: 'blockerId',
        primaryKey: true
      },
      through: 'UserBlocks'
    });

    User.belongsToMany(models.User, {
      as: 'blocker',
      foreignKey: {
        name: 'blockedId',
        primaryKey: true
      },
      through: 'UserBlocks'
    });

    User.belongsToMany(models.User, {
      as: 'user',
      foreignKey: {
        name: 'contactId',
        primaryKey: true
      },
      through: 'MessageContacts'
    });

    User.belongsToMany(models.User, {
      as: 'contact',
      foreignKey: {
        name: 'userId',
        primaryKey: true
      },
      through: 'MessageContacts'
    });

    User.hasMany(models.Reaction, {
      as: 'reactions',
      foreignKey: {
        name: 'userId',
        allowNull: false
      },
      onDelete: 'CASCADE'
    });
  };

  return User;
};