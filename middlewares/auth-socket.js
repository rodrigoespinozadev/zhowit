var jwt = require('jsonwebtoken');
var env = require('../config/env');

const auth = {
  isAuthenticated: (socket, next) => {
    let token = socket.handshake.query.token;
    if (token) {
      jwt.verify(token, env.jwt_secret, (err, decoded) => {
        if (err) {
          return next(new Error('authentication error'));
        } else {
          socket.user = decoded;
          return next();
        }
      });
    } else {
      return next(new Error('authentication error'));
    }
  }
}

module.exports = auth;