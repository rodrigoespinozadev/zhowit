var express = require('express');
var router = express.Router();
let auth = require('./../middlewares/auth');
var models  = require('../models');
const Op = models.Sequelize.Op;

router.get('/:username', auth.isAuthenticated, (req, res, next) => {
  models.User.findOne({
    where: {
      profile_url: req.params.username
    }
  }).then(contact => {
    models.Message.findAll({
      where: {
        [Op.or]: [
          {
            senderId: req.user.id,
            receiverId: contact.id
          },
          {
            senderId: contact.id,
            receiverId: req.user.id
          }
        ]
      },
      order: [['createdAt', 'ASC']],
      include: [{
        model: models.User,
        attributes: ['id', 'username', 'type', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage'],
        as: 'sender'
      }]
    }).then(messages => {
      res.json(messages);
    });
  });
});

module.exports = router;
