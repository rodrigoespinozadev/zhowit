#!/bin/bash
cd delete/node-api/
git pull > ~/git_production_update.log
node_modules/.bin/sequelize db:migrate ~/sequelize_migrate.log
sh -c 'pm2 restart www' > ~/pm2.log