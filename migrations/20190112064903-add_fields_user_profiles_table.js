'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    let migrations = [];
    
    migrations.push(queryInterface.addColumn('UserProfiles', 'linkedin_url', {
      allowNull: true,
      type: Sequelize.DataTypes.STRING,
      defaultValue: null,
      after: 'spotify_url'
    }))
    
    migrations.push(queryInterface.addColumn('UserProfiles', 'instagram_url', {
      allowNull: true,
      type: Sequelize.DataTypes.STRING,
      defaultValue: null,
      after: 'linkedin_url'
    }));
    
    migrations.push(queryInterface.addColumn('UserProfiles', 'youtube_url', {
      allowNull: true,
      type: Sequelize.DataTypes.STRING,
      defaultValue: null,
      after: 'instagram_url'
    }));

    return Promise.all(migrations);
  },

  down: (queryInterface, Sequelize) => {
    let migrations = [];
    migrations.push(queryInterface.removeColumn('UserProfiles', 'linkedin_url'));
    migrations.push(queryInterface.removeColumn('UserProfiles', 'instagram_url'));
    migrations.push(queryInterface.removeColumn('UserProfiles', 'youtube_url'));
    return Promise.all(migrations);
  }
};
