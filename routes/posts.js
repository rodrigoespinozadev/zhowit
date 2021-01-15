var models  = require('../models');
var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const Op = models.Sequelize.Op;
const Sequelize = models.Sequelize;
const env = require('../config/env');
const auth = require('../middlewares/auth');

const postsInclude = [
  {
    model: models.User,
    as: 'user',
    attributes: ['username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
  },
  {
    model: models.PostFile,
    as: 'files',
    attributes: ['id', 'type', 'url']
  },
  {
    model: models.Category,
    as: 'category',
    attributes: ['id', 'slug', 'image']
  }
];

const getUserReactions = (postIds, user) => {
  return user.getReactions({
    where: {
      objectType: 'post',
      objectTypeId: { [Op.in]: postIds }
    }
  });
};

const getUserSavedPosts = (postIds, user) => {
  return user.getPostSaved({
    where: {
      id: { [Op.in]: postIds }
    }
  });
};

const getUserCommentedPosts = (postIds, userId) => {
  return models.Comment.findAll({
    where: {
      postId: { [Op.in]: postIds },
      userId: userId
    }
  });
};

const getPostComments = (postIds, users) => {
  let where = { postId: { [Op.in]: postIds } }
  if (users.length) {
    where = {
      postId: { [Op.in]: postIds },
      userId: {
        [Op.notIn]: users
      }
    }
  }
  return models.Comment.findAll({
    where: where,
    order: [['id', 'ASC']],
    include: [{
      model: models.User,
      as: 'user',
      attributes: ['id', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
    }]
  });
};

const getSharedPosts = (postIds) => {
  return models.Post.findAll({
    where: {
      id: { [Op.in]: postIds }
    },
    include: [{
      model: models.User,
      as: 'user',
      attributes: ['id', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
    },{
    model: models.PostFile,
    as: 'files',
    attributes: ['id', 'type', 'url']
  }]
  })
}

const getPosts = (req, where, include = []) => {
  return models.Post.findAll({
    where: { ...where },
    order: [['id', 'DESC']],
    limit: 10,
    include: [...postsInclude, ...include]
  });
};

const getTypePosts = (req, where, include = []) => {
  let query = {
    where: where,
    include:[...include],
    order: [['id', 'DESC']]
  }
  if (req.query.limit) {
    query = {
      ...query,
      limit: parseInt(req.query.limit)
    }
  }
  return models.PostFile.findAll(query);
};

const getUserCommentReactions = userId => {
  return models.Reaction.findAll({
    where: {
      objectType: 'comment',
      userId: userId
    },
    attributes: ['objectTypeId']
  });
}

const fillPosts = (res, posts, user = null, single = false) => {
  if(user) {
    user.getBlocker().then(blockers => {
      const postIds = posts.map(post => post.id);
      const reactionPromise = getUserReactions(postIds, user);
      const savedPostsPromise = getUserSavedPosts(postIds, user);
      const commentedPostsPromise = getUserCommentedPosts(postIds, user.id);
      const postsCommentsPromise = getPostComments(postIds, blockers.map(blocker => blocker.id));
      const userCommentReactions = getUserCommentReactions(user.id);

      Promise.all([
        reactionPromise,
        savedPostsPromise,
        commentedPostsPromise,
        postsCommentsPromise,
        userCommentReactions
      ]).then(results => {
        [reactions, savedPosts, comments, postcomments, userReactions] = results;
        posts.forEach(post => {
          post.reacted = false;
          post.isOwner = post.userId == user.id;
          post.commentsItems = [];
          post.saved = savedPosts.find(savedPost => savedPost.id === post.id) ? true : false;
          post.commented = comments.find(comment => comment.postId === post.id) ? true : false;
          postcomments.forEach(comment => {
            if(comment.postId === post.id) {
              comment.reacted = userReactions.find(reaction => reaction.objectTypeId == comment.id) ? true : false;
              comment.isOwner = comment.userId == user.id;
              post.commentsItems.push(comment);
            }
          });
          reactions.forEach(reaction => {
            if(reaction.objectTypeId === post.id) {
              post.reacted = true;
              post.reaction = reaction.type;
            }
          });
        });
        res.json(single ? posts[0] : posts);
      }).catch(err => console.error(err));
    })
  } else {
    posts.forEach(post => {
      post.reacted = false;
      post.saved = false;
      post.commented = false;
    });
    res.json(single ? posts[0] : posts);
  }
};

const fillPostsPaginate = (res, posts, user = null, limit) => {
  if(user) {
    user.getBlocker().then(blockers => {
      const postIds = posts.map(post => post.id);
      const postShareIds = posts.map(post => post.shareId);
      const reactionPromise = getUserReactions(postIds, user);
      const savedPostsPromise = getUserSavedPosts(postIds, user);
      const commentedPostsPromise = getUserCommentedPosts(postIds, user.id);
      const postsCommentsPromise = getPostComments(postIds, blockers.map(blocker => blocker.id));
      const userCommentReactions = getUserCommentReactions(user.id);
      const postShareOwnerPromise = getSharedPosts(postShareIds);

      Promise.all([
        reactionPromise,
        savedPostsPromise,
        commentedPostsPromise,
        postsCommentsPromise,
        userCommentReactions,
        postShareOwnerPromise
      ]).then(results => {
        [reactions, savedPosts, comments, postcomments, userReactions, sharedOwners] = results;
        posts.forEach(post => {
          post.reacted = false;
          post.sharedPost = {}
          post.isOwner = post.userId == user.id;
          post.commentsItems = [];
          post.saved = savedPosts.find(savedPost => savedPost.id === post.id) ? true : false;
          post.commented = comments.find(comment => comment.postId === post.id) ? true : false;
          postcomments.forEach(comment => {
            if(comment.postId === post.id) {
              comment.reacted = userReactions.find(reaction => reaction.objectTypeId == comment.id) ? true : false;
              comment.isOwner = comment.userId == user.id;
              post.commentsItems.push(comment);
            }
          });
          sharedOwners.forEach(sharedPost => {
            if(sharedPost.id === post.shareId) {
              post.sharedPost = sharedPost
            }
          });
          reactions.forEach(reaction => {
            if(reaction.objectTypeId === post.id) {
              post.reacted = true;
              post.reaction = reaction.type;
            }
          });
        });
        res.json({'posts': posts, 'limit': limit});
      }).catch(err => console.error(err));
    })
  } else {
    posts.forEach(post => {
      post.reacted = false;
      post.saved = false;
      post.commented = false;
    });
    res.json({'posts': posts, 'limit': limit});
  }
};

const sortProperties = (obj, sortedBy, isNumericSort, reverse) => {
    sortedBy = sortedBy || 1; // by default first key
    isNumericSort = isNumericSort || false; // by default text sort
    reverse = reverse || false; // by default no reverse

    var reversed = (reverse) ? -1 : 1;
    var sortable = [];

    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            sortable.push(obj[key]);
        }
    }

    if (isNumericSort)
        sortable.sort(function (a, b) {
            return reversed * (a[sortedBy] - b[sortedBy]);
        });
    else
        sortable.sort(function (a, b) {
            var x = a[sortedBy].toLowerCase(),
                y = b[sortedBy].toLowerCase();
            return x < y ? reversed * -1 : x > y ? reversed : 0;
        });
    return sortable;
}

const getProfileFeed = (req, where, user) => {
  var promiseArray = []

  let page = req.query.page ? req.query.page : 1
  let limit = 10
  let offset = limit * (page - 1)

  var userSharePosts = models.Post.findAndCountAll({
    where: { ...where, shareId: { [Op.ne]: null } },
    order: [['id', 'DESC']],
    limit: limit,
    offset: offset,
    include: [{
      model: models.User,
      as: 'user',
      attributes: ['username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
    },
    {
      model: models.Category,
      as: 'category',
      attributes: ['id', 'slug', 'image']
    }]
  });

  var userPosts = models.Post.findAndCountAll({
    where: { ...where, shareId: null },
    order: [['id', 'DESC']],
    limit: limit,
    offset: offset,
    include: [...postsInclude]
  });

  promiseArray.push(userSharePosts);
  promiseArray.push(userPosts);

  return Sequelize.Promise.filter(promiseArray, function(result) {
    return result
  });
};

const getFrontPageFeed = (req, users, userId) => {
  var promiseArray = []

  let page = req.query.page ? req.query.page : 1
  let limit = 10
  let offset = limit * (page - 1)

  var usersPosts = models.Post.findAndCountAll({
    where: { userId: { [Op.in]: users } },
    order: [['id', 'DESC']],
    limit: limit,
    offset: offset,
    include: [{
      model: models.User,
      as: 'user',
      attributes: ['username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
    },
    {
      model: models.PostFile,
      as: 'files',
      attributes: ['id', 'type', 'url']
    },
    {
      model: models.Category,
      as: 'category',
      attributes: ['id', 'slug', 'image']
    }]
  })

  var userPosts = models.Post.findAndCountAll({
    where: { userId: userId },
    order: [['id', 'DESC']],
    limit: limit,
    offset: offset,
    include: [...postsInclude]
  });

  promiseArray.push(usersPosts);
  promiseArray.push(userPosts);

  return Sequelize.Promise.filter(promiseArray, (res) => {
    return res
  })
}

// username, category, feed, liked, disliked, saved
router.get('/feed', auth.isAuthenticated, (req, res, next) => {
  // self posts, subscribed categories posts, followed users posts
  models.User.findById(req.user.id).then(user => {
    if (req.query.filter == 'agencia') {
      user.getBlocker().then(blockers => {
        let where = {}
        if (blockers.length) {
          where = {
              id: {
                [Op.notIn]: [blockers.map(blocker => blocker.id)]
              }
            }
        }
        models.User.findAll({
            where: where
        }).then(followers => {
            const users = followers.map(user => user.id)
            getFrontPageFeed(req, users, user.id).then(posts => {
              var postsMerged = [...posts[0].rows, ...posts[1].rows]
              var count = posts[1].count > posts[0].count ? posts[1].count : posts[0].count
              fillPostsPaginate(res, sortProperties(postsMerged, 'id', true, true), user, Math.ceil(count / 10));
            })
        });
      })
      /* user.getCategories({attributes: ['id']}).then(categories => {
        models.Interest.findAll({
          where: {
            userId: {
              [Op.ne]: req.user.id
            },
            categoryId: {
              [Op.in]: categories.map(category => category.id)
            }
          },
          attributes: ['userId']
        }).then(userInterest => {
          const users = userInterest.map(user => user.userId)
          getFrontPageFeed(req, users, user.id).then(posts => {
            var postsMerged = [...posts[0].rows, ...posts[1].rows]
            var count = posts[1].count > posts[0].count ? posts[1].count : posts[0].count
            fillPostsPaginate(res, sortProperties(postsMerged, 'id', true, true), user, Math.ceil(count / 10));
          })
        })
      }); */
    } else {
      user.getBlocker().then(blockers => {
        let where = {}
        if (blockers.length) {
          where = {
              followedId: {
                [Op.notIn]: [blockers.map(blocker => blocker.id)]
              }
            }
        }
        user.getFollowed({
          through: {
            where: where
          }
        }).then(followers => {
            const users = followers.map(user => user.id)
            getFrontPageFeed(req, users, user.id).then(posts => {
              var postsMerged = [...posts[0].rows, ...posts[1].rows]
              var count = posts[1].count > posts[0].count ? posts[1].count : posts[0].count
              fillPostsPaginate(res, sortProperties(postsMerged, 'id', true, true), user, Math.ceil(count / 10));
            })
        });
      })
    }
  });
});

// profile page user feed
router.get('/user/:username', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: { profile_url: req.params.username }
  }).then(user => {    
    const where = { userId: user.id };
    getProfileFeed(req, where, user).then(posts => {
      var postsMerged = [...posts[0].rows, ...posts[1].rows]
      var count = posts[1].count > posts[0].count ? posts[1].count : posts[0].count
      models.User.findById(req.user.id).then(currentUser => {
        fillPostsPaginate(res, sortProperties(postsMerged, 'id', true, true), currentUser, Math.ceil(count / 10));
      });
    });
  });
});

router.get('/saved', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.getPostSaved({
      where: {
        id: { [Op.lt]: req.query.oldestPostId }
      },
      order: [
        ['id', 'DESC']
      ],
      limit: 10,
      include: postsInclude
    }).then(posts => {
      fillPosts(res, posts, user);
    });
  });
});

router.get('/category/:slug', (req, res, next) => {
  models.Category.findOne({
    where: { slug: req.params.slug }
  }).then(category => {
    const where = { categoryId: category.id };
    getPosts(req, where).then(posts => {
      if(req.user) {
        models.User.findById(req.user.id).then(currentUser => {
          fillPosts(res, posts, currentUser);
        });
      } else {
        fillPosts(res, posts);
      }
    });
  })
});

// Profile postfiles by type
router.get('/user/:profile/:type/type', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: { profile_url: req.params.profile }
  }).then(user => {
    const where = { type: req.params.type };
    const include = [{
      model: models.Post,
      where: { userId: user.id },
      as: 'post'
    }];
    getTypePosts(req, where, include).then(images => {
      models.User.findById(req.user.id).then(currentUser => {
        const postIds = images.map(image => image.post.id);
        const reactionPromise = getUserReactions(postIds, currentUser);
        Promise.all([
          reactionPromise
        ]).then(results => {
          [userReactions] = results;
          images.forEach(image => {
            image.post.reacted = userReactions.find(reaction => reaction.objectTypeId == image.post.id) ? true : false;
          });          
          res.json(images)
        })
      });
    });
  })
});

router.get('/user/:username/liked', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: { username: req.params.username }
  }).then(user => {
    const include = [{
      model: models.Reaction,
      as: 'reactions',
      where: {
        objectType: 'post',
        type: 'like',
        userId: user.id
      }
    }];
    getPosts(req, {}, include).then(posts => {
      if(req.user) {
        models.User.findById(req.user.id).then(currentUser => {
          fillPosts(res, posts, currentUser);
        });
      } else {
        fillPosts(res, posts);
      }
    });
  });
});

router.get('/user/:username/disliked', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: { username: req.params.username }
  }).then(user => {
    const include = [{
      model: models.Reaction,
      as: 'reactions',
      where: {
        objectType: 'post',
        type: 'dislike',
        userId: user.id
      }
    }];
    getPosts(req, {}, include).then(posts => {
      if(req.user) {
        models.User.findById(req.user.id).then(currentUser => {
          fillPosts(res, posts, currentUser);
        });
      } else {
        fillPosts(res, posts);
      }
    });
  });
});

router.get('/:id', auth.decode, (req, res, next) => {
  const where = { id: req.params.id };
  getPosts(req, where).then(posts => {
    if(req.user) {
      models.User.findById(req.user.id).then(currentUser => {
        fillPosts(res, posts, currentUser, true);
      });
    } else {
      fillPosts(res, posts, null, true);
    }
  });
});

router.post('/', auth.isAuthenticated, (req, res, next) => {
  models.Post.create({
    title: req.body.title,
    description: req.body.description,
    userId: req.user.id,
    categoryId: req.body.categoryId
  })
  .then(post =>  {
    models.User.findById(req.user.id).then(user => {
      user.increment('postsCount');
    });
    if (req.body.files && req.body.files.length) {
      let i = 0;
      req.body.files.forEach(file => {
        const fileType = file.type.startsWith('image') ? 'PHOTO' : file.type.startsWith('video') ? 'VIDEO' : 'FILE';
        //let fileUrl = file.url.split('?')[0].split('/');
        //fileUrl.splice(2, 1);
        //fileUrl = fileUrl.join('/');
        let fileObject = {
          type: fileType,
          url: file.url,
          postId: post.id
        }

        if (fileType == 'FILE') {
          fileObject.filename = file.filename
        }

        models.PostFile.create(fileObject)
        .then(file => {
          models.Post.findOne({
            where: {id: post.id},
            include: [{
              model: models.User,
              as: 'user',
              attributes: ['username', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
            },{
              model: models.PostFile,
              as: 'files'
            }]
          }).then(post => {
            i++;
            if (req.body.files.length == i) {
              res.json(post);
            }
          });
        });
      });
    } else {
      if (req.body.videoUrl) {
        models.PostFile.create({
          type: 'VIDEO',
          url: req.body.videoUrl,
          postId: post.id
        })
        .then(video => {
          models.Post.findOne({
            where: {id: post.id},
            include: [{
              model: models.User,
              as: 'user',
              attributes: ['username', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
            },{
              model: models.PostFile,
              as: 'files'
            }]
          }).then(post => {
            res.json(post);
          });
        });
      } else {
        models.Post.findOne({
          where: {id: post.id},
          include: [{
            model: models.User,
            as: 'user',
            attributes: ['username', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
          },{
            model: models.PostFile,
            as: 'files'
          }]
        }).then(post => {
          res.json(post);
        });
      }
    }
  });
});

// Share post
router.post('/share', auth.isAuthenticated, (req, res, next) => {
  models.Post.create({
    title: '',
    description: req.body.description,
    shareId: req.body.id,
    userId: req.user.id,
    categoryId: 1
  })
  .then(post =>  {
    models.User.findById(req.user.id).then(user => {
      user.increment('postsCount');
    });
    
    models.Post.findById(req.body.id).then(post => {
      post.increment('shareCount');
    });

    models.Post.findOne({
      where: { id: post.id },
      include: [{
        model: models.User,
        as: 'user',
        attributes: ['id', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
      }]}).then(newPost => {
        models.Post.findOne({
          where: { id: req.body.id },
          include: [{
            model: models.User,
            as: 'user',
            attributes: ['id', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'type']
          },{
          model: models.PostFile,
          as: 'files',
          attributes: ['id', 'type', 'url']
        }]}).then(sharedPost => {
          newPost.sharedPost = sharedPost
          newPost.isOwner = true
          newPost.commentsItems = []
          res.json(newPost);
        })
    });    
  });
});

router.delete('/:id', auth.isAuthenticated, (req, res, next) => {
  models.Post.findById(req.params.id).then(post => {
    if (req.user.id == post.userId) {
      post.destroy().then(r => {
        res.json(post);
      });
    }
  })
});

router.post('/save', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.addPostSaved(req.body.postId).then(post => {
      res.json(post);
    });
  });
});

router.post('/unsave', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.removePostSaved(req.body.postId).then(post => {
      res.json(post);
    });
  });
});

// AWS S3 image upload
router.post('/aws-url', auth.isAuthenticated, (req, res, next) => {
  AWS.config.accessKeyId = env.aws_accessKeyId;
  AWS.config.secretAccessKey = env.aws_secretAccessKey;
  AWS.config.region = env.aws_region;

  let s3 = new AWS.S3();
  var params = {
    Bucket: env.aws_bucket,
    Key: `users/${req.user.username}/posts/${req.body.filename.split('.').slice(0, -1).join('.')}.${req.body.filename.split('.').pop()}`,
    ContentEncoding: 'base64',
    ContentType: req.body.type,
    Expires: 60,
    ACL: 'public-read'
  };
  s3.getSignedUrl('putObject', params, function (err, url) {
    res.json({url: url});
  });
});

router.put('/change-comment', auth.isAuthenticated, (req, res, next) => {
  models.Post.findOne({ where : { id: req.body.id, userId: req.user.id }})
    .then(post => {
      if (req.body.description != null) {
        post.description = req.body.description
        post.save();
      }
      res.json(post);
    });
});

module.exports = router;