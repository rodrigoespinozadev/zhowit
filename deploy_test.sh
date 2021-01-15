#!/bin/bash
cd test/node-api/
git pull > ~/git_test_update.log
node_modules/.bin/sequelize db:migrate ~/sequelize_migrate.log
sh -c 'pm2 restart test' > ~/pm2.log