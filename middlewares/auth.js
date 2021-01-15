var jwt = require('jsonwebtoken');
var env = require('../config/env');

const auth = {
  decode: (req, res, next) => {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
      jwt.verify(token, env.jwt_secret, (err, decoded) => {
        if (!err) {
          req.user = decoded;
        }
        next();
      });
    } else {
      next();
    }
  },
  isAuthenticated: (req, res, next) => {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
      jwt.verify(token, env.jwt_secret, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: 'Failed to authenticate token.' });
        } else {
          req.user = decoded;
          next();
        }
      });
    } else {
      return res.status(401).json({ message: 'No token provided.' });
    }
  },
  isGuest: (req, res, next) => {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (token) {
      jwt.verify(token, env.jwt_secret, (err, decoded) => {
        if (err) {
          next();
        } else {
          req.user = decoded;
          return res.status(403).json({ message: 'Token provided.' });    
        }
      });
    } else {
      next();
    }
  }
}

module.exports = auth;