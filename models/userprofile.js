'use strict';
module.exports = (sequelize, DataTypes) => {
  var UserProfile = sequelize.define('UserProfile', {
    web: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    phone: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    facebook_url: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    twitter_url: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    spotify_url: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    linkedin_url: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    instagram_url: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    youtube_url: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null
    },
    followers: {
      allowNull: true,
      type: DataTypes.BOOLEAN,
      defaultValue: 1
    },
    following: {
      allowNull: true,
      type: DataTypes.BOOLEAN,
      defaultValue: 1
    },
    photo_videos: {
      allowNull: true,
      type: DataTypes.BOOLEAN,
      defaultValue: 1
    },
    messages: {
      allowNull: true,
      type: DataTypes.BOOLEAN,
      defaultValue: 1
    }
  });

  UserProfile.associate = function(models) {
    UserProfile.belongsTo(models.User);
  };

  UserProfile.removeAttribute('id');
  return UserProfile;
};