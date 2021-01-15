var models  = require('../models');
var express = require('express');
var router = express.Router();
let auth = require('./../middlewares/auth');
const notifier = require('../helpers/notifications');

router.get('/:id', (req, res, next) => {
  models.Comment.findById(req.params.id, {
    include: ['user']
  }).then(comment => {
    res.json(comment);
  });
});

router.get('/post/:postId', (req, res, next) => {
  models.Comment.findAll({
    where: {
      postId: req.params.postId
    },
    include: ['user']
  }).then(comments => {
    res.json(comments);
  });
});

router.delete('/:id', auth.isAuthenticated, (req, res, next) => {
  models.Comment.findById(req.params.id).then(comment => {
    if (req.user.id == comment.userId) {
      comment.destroy().then(r => {
        models.Post.findById(comment.postId).then(post => {
          post.decrement(`commentsCount`);
          res.json(r);
        });
      });
    }
  })
});

router.post('/', auth.isAuthenticated, (req, res, next) => {
  models.Comment.create({
    comment: req.body.comment,
    postId: req.body.postId,
    userId: req.user.id
  }).then(comment => {
    models.Post.findById(req.body.postId).then(post => {
      post.increment(`commentsCount`);
      if (post.userId != req.user.id) {
        notifier.notification(req.app.io, 'COMMENT', post.userId, req.user.id, req.body.postId);
      }
    });
    models.User.findById(comment.userId, {
      attributes: ['username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage']
    }).then(user =>  {
      comment.setDataValue('user', user);
      comment.isOwner = true;
      //comment.setDataValue('user', await comment.getUser())
      res.json(comment);
    });
  });
});

router.put('/change-comment', auth.isAuthenticated, (req, res, next) => {
  models.Comment.findOne({ where : { id: req.body.id, userId: req.user.id }})
    .then(comment => {
      if (req.body.comment != null) {
        comment.comment = req.body.comment
        comment.isOwner = true;
        comment.save();
      }
      res.json(comment);
    });
});

module.exports = router;
