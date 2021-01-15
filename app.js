let express = require('express');
let logger = require('morgan');
let bodyParser = require('body-parser');
let expressValidator = require('express-validator');
let expressValidatorHelper = require('express-validator-helper');
const io = require('socket.io')();
const path = require('path');
const passport = require("passport");
const resizeApp = require('express-resize-img');

let app = express();
app.io = io;

global.appRoot = path.resolve(__dirname);

let users = require('./routes/users');
let categories = require('./routes/categories');
let posts = require('./routes/posts');
let comments = require('./routes/comments');
let reactions = require('./routes/reactions');
let messages = require('./routes/messages');
let notifications = require('./routes/notifications');
let messagesSocket = require('./sockets/messages')(io);
let notificationsSocket = require('./sockets/notifications')(io);

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(expressValidatorHelper());
app.use(passport.initialize());

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, x-access-token");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

// Routes
app.get('/index.html', (req, res) => res.send('Hello World!'));
app.use('/users', users);
app.use('/categories', categories);
app.use('/posts', posts);
app.use('/comments', comments);
app.use('/reactions', reactions);
app.use('/messages', messages);
app.use('/notifications', notifications);
app.use('/resize', resizeApp);

// Socket.io
// let mesages = require('./sockets/messages')(io);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json(res.locals.error);
});

module.exports = app;
