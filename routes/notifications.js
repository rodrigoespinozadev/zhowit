var express = require('express');
var router = express.Router();
let auth = require('./../middlewares/auth');
var models  = require('../models');
const Op = models.Sequelize.Op;
//const notifier = require('../helpers/notifications');

router.get('/', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.getBlocker().then(blockers => {
      if (req.query.page) {
        let where = {
            userId: req.user.id,
            type: {
              [Op.not]: 'MESSAGE'
            }
          }
        if (blockers.length) {
          where = {
            userId: req.user.id,
            actorId: {
              [Op.notIn]: blockers.map(blocker => blocker.id)
            },
            type: {
              [Op.not]: 'MESSAGE'
            }
          }
        }
        models.Notification.findAndCountAll({
          order: [['id', 'DESC']],
          limit: 12,
          where: where,
          include: [{
            model: models.User,
            as: 'actor',
            attributes: ['id', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
          }]
        }).then(notifications => {
          res.json(notifications);
        });
      } else {
        let where = {
            userId: req.user.id,
            type: {
              [Op.not]: 'MESSAGE'
            }
          }
        if (blockers.length) {
          where = {
            userId: req.user.id,
            actorId: {
              [Op.notIn]: blockers.map(blocker => blocker.id)
            },
            type: {
              [Op.not]: 'MESSAGE'
            }
          }
        }
        models.Notification.findAll({
          order: [['id', 'DESC']],
          limit: 10,
          where: where,
          include: [{
            model: models.User,
            as: 'actor',
            attributes: ['id', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
          }]
        }).then(notifications => {
          //notifier.resetNotifications('ALL-EXCEPT-MESSAGE', req.user.id);
          res.json(notifications);
        });
      }
    })
  })
});

router.get('/messages', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.getBlocker().then(blockers => {
      let where = {
          userId: req.user.id,
          type: 'MESSAGE'
        }
      if (blockers.length) {
        where = {
          userId: req.user.id,
          actorId: {
            [Op.notIn]: blockers.map(blocker => blocker.id)
          },
          type: 'MESSAGE'
        }
      }
      models.Notification.findAll({
        order: [['id', 'DESC']],
        limit: 10,
        where: where,
        include: [{
          model: models.User,
          as: 'actor',
          attributes: ['id', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
        },{
          model: models.Message,
          as: 'message'
        }]
      }).then(notifications => {
        res.json(notifications);
      });
    })
  })
});

router.post('/update_read', auth.isAuthenticated, (req, res, next) => {
  models.Notification.update({ is_read: 1 }, {
    where: {
      id: { [Op.in]: req.body.notificationIds },
      userId: req.user.id
    }
  }).then(() => {
    res.json('updated')
  })
})

module.exports = router;
