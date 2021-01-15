let auth = require('./../middlewares/auth-socket');
var models = require('../models');
const notifier = require('../helpers/notifications');

const sio = io => {
  io.use(auth.isAuthenticated).on('connection', (socket) => {
    console.log('joined messages-' + socket.user.id)
    socket.join('messages-' + socket.user.id);
  
    socket.on('add-message', (message) => {
      models.Message.create({
        message: message.message,
        senderId: socket.user.id,
        receiverId: message.receiverId
      }).then(message => {
        models.Notification.create({
          type: 'MESSAGE',
          userId: message.receiverId,
          actorId: socket.user.id,
          postId: null,
          messageId: message.id,
          is_read: 0
        }).then(notification => {
          models.Notification.findById(notification.id,{
            include: [{
              model: models.User,
              as: 'actor',
              attributes: ['id', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
            },{
              model: models.Message,
              as: 'message'
            }]
          }).then(notification => {
            io.to('messages-' + message.receiverId).emit('message', notification);
          });
        });
      });

      models.User.findById(message.receiverId).then(user => {
        user.removeContact(socket.user.id).then(c => {
          user.addContact(socket.user.id).then(c => {});
        });
        user.removeUser(socket.user.id).then(c => {
          user.addUser(socket.user.id).then(c => {});
        });
      });
    });
  
  });
};

module.exports = sio;
