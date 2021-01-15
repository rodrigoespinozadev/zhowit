var models  = require('../models');

exports.notification = function(io, type, userId, actorId, postId=null, messageId=null) {
  models.Notification.create({
    type: type,
    userId: userId,
    actorId: actorId,
    postId: postId,
    messageId: messageId,
    is_read: 0
  }).then(notification => {
    models.User.findById(notification.actorId, {
      attributes: ['id', 'type', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage']
    }).then(user => {
      let payload = notification.toJSON()
      payload.actor = user
      //payload.setDataValue('actor', user);
      io.to('notifications-' + userId).emit('notification', payload);
    })
  });
  
  models.User.findById(userId).then(user =>  {
    if (type === 'MESSAGE') {
      user.increment(`unreadedMessagesCount`);
    } else {
      user.increment(`unreadedNotificationsCount`);
    }
  });
}

exports.resetNotifications = function(type, userId) {
  models.User.findById(userId).then(user =>  {
    if (type === 'MESSAGE') {
      user.unreadedMessagesCount = 0;
    } else {
      user.unreadedNotificationsCount = 0;
    }
    user.save();
  });
}