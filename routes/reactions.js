var models  = require('../models');
var express = require('express');
var router = express.Router();
let auth = require('./../middlewares/auth');
const notifier = require('../helpers/notifications');

router.post('/:type/:objectType/:objectTypeId', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    models.Reaction.findOne({
      where: {
        objectType: req.params.objectType,
        objectTypeId: req.params.objectTypeId,
        userId: req.user.id
      }
    }).then(reaction => {
      if (reaction) {
        if(reaction.type === req.params.type) {
          reaction.destroy().then(r => {
            switch(req.params.objectType) {
              case 'post':
                models.Post.findById(req.params.objectTypeId).then(post => {
                  post.decrement(`${req.params.type}sCount`);
                  user.decrement(`${req.params.type}sCount`);
                  res.json(r);
                });
              break;
              case 'comment':
                models.Comment.findById(req.params.objectTypeId).then(comment => {
                  comment.decrement(`${req.params.type}sCount`);
                  user.decrement(`${req.params.type}sCount`);
                  res.json(r);
                });
              break;
            }
          });
        } else {
          reaction.type = req.params.type;
          reaction.save().then(r => {
            switch (req.params.objectType) {
              case 'post':
                models.Post.findById(req.params.objectTypeId).then(post => {
                  if(req.params.type === 'like') {
                    post.increment(`likesCount`);
                    post.decrement(`dislikesCount`);
                    user.increment(`likesCount`);
                    user.decrement(`dislikesCount`);
                  } else {
                    post.increment(`dislikesCount`);
                    post.decrement(`likesCount`);
                    user.increment(`dislikesCount`);
                    user.decrement(`likesCount`);
                  }
                  if (post.userId != req.user.id) {
                    notifier.notification(req.app.io, req.params.type.toUpperCase() + '_' + req.params.objectType.toUpperCase(), post.userId, req.user.id, post.id);
                  }
                  res.json(r);
                });
                break;
              case 'comment':
                models.Comment.findById(req.params.objectTypeId).then(comment => {
                  if(req.params.type === 'like') {
                    comment.increment(`likesCount`);
                    comment.decrement(`dislikesCount`);
                    user.increment(`likesCount`);
                    user.decrement(`dislikesCount`);
                  } else {
                    comment.increment(`dislikesCount`);
                    comment.decrement(`likesCount`);
                    user.increment(`dislikesCount`);
                    user.decrement(`likesCount`);
                  }
                  //models.Post.findById(comment.postId).then(post => {
                    if (comment.userId != req.user.id) {
                      notifier.notification(req.app.io, req.params.type.toUpperCase() + '_' + req.params.objectType.toUpperCase(), comment.userId, req.user.id, comment.postId);
                    }
                    res.json(r);
                  //});
                });
                break;
            }
          });
        }
      } else {
        models.Reaction.create({
          type: req.params.type,
          objectType: req.params.objectType,
          objectTypeId: req.params.objectTypeId,
          userId: req.user.id
        }).then(r => {
          switch (req.params.objectType) {
            case 'post':
              models.Post.findById(req.params.objectTypeId).then(post => {
                post.increment(`${req.params.type}sCount`);
                user.increment(`${req.params.type}sCount`);
                if (post.userId != req.user.id) {
                  notifier.notification(req.app.io, req.params.type.toUpperCase() + '_' + req.params.objectType.toUpperCase(), post.userId, req.user.id, post.id);
                }
                res.json(r);
              });
              break;
            case 'comment':
              models.Comment.findById(req.params.objectTypeId).then(comment => {
                comment.increment(`${req.params.type}sCount`);
                user.increment(`${req.params.type}sCount`);
                //models.Post.findById(comment.postId).then(post => {
                  if (comment.userId != req.user.id) {
                    notifier.notification(req.app.io, req.params.type.toUpperCase() + '_' + req.params.objectType.toUpperCase(), comment.userId, req.user.id, comment.postId);
                  }
                  res.json(r);
                //});
              });
              break;
          }
        });
      }
    });
  });
});

module.exports = router;
