let auth = require('./../middlewares/auth-socket');
var models  = require('../models');

const sio = io => {
  io.use(auth.isAuthenticated).on('connection', (socket) => {
    console.log('joined notifications-' + socket.user.id)
    socket.join('notifications-' + socket.user.id);
  });
};

module.exports = sio;
