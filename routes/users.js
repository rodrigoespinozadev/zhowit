var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var AWS = require('aws-sdk');
var models  = require('../models');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var fs = require('fs');

const uuidv4 = require('uuid/v4');
const Op = models.Sequelize.Op;
const Sequelize = models.Sequelize;
const env = require('../config/env');
const auth = require('../middlewares/auth');
const notifier = require('../helpers/notifications');

const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    fullname: user.fullname,
    profileImage: user.profileImage,
    coverImage: user.coverImage,
    langCode: user.langCode,
    profileType: user.type,
    verified: user.isVerified
  };
  let token = jwt.sign(payload, env.jwt_secret, {
    expiresIn: '7d'
  });
  return token;
};

const updateProfile = (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.nombre = req.body.nombre;
    user.apellido = req.body.apellido;
    user.email = req.body.email;
    user.birthdate = req.body.fecha;
    user.sex = req.body.sexo;
    user.country = req.body.pais;
    user.biography = req.body.biografia;
    user.save();
    models.UserProfile.findOne({
      where: {
        UserId: user.id
      }
    }).then(profile => {
      profile.facebook_url = req.body.profile.facebook_url;
      profile.twitter_url = req.body.profile.twitter_url;
      profile.spotify_url = req.body.profile.spotify_url;
      profile.linkedin_url = req.body.profile.linkedin_url;
      profile.instagram_url = req.body.profile.instagram_url;
      profile.youtube_url = req.body.profile.youtube_url;
      profile.web = req.body.profile.web;
      profile.phone = req.body.profile.phone;
      profile.save();
      const token = generateToken(user);
      res.json({token: token});
    }).catch(err => {
      res.status(400).json({
        error: err
      });
    });
  });
}

const getUserProfile = (userId) => {
  return models.UserProfile.findOne({
    where: {
      UserId: userId
    },
    attributes: {
      exclude: ['createdAt', 'updatedAt', 'UserId']
    }
  });
};

router.get('/search', auth.decode, (req, res, next) => {
  if (req.user) {
    models.User.findById(req.user.id).then(user => {
      user.getBlocker().then(blockers => {
        models.User.findAll({
          attributes: ['profile_url', 'nombre', 'apellido', 'fullname'],
          where: {
            type: 'talento',
            id: {
              [Op.notIn]: blockers.map(blocker => blocker.id)
            },
            [Op.or]: [
              {
                nombre: {
                  [Op.like]: `%${req.query.term}%`
                }
              },
              {
                apellido: {
                  [Op.like]: `%${req.query.term}%`
                }
              },
              {
                username: {
                  [Op.like]: `%${req.query.term}%`
                }
              }
            ]
          },
        }).then(users => {
          res.json(users);
        });
      })
    })
  } else {
    models.User.findAll({
      attributes: ['profile_url', 'nombre', 'apellido', 'fullname'],
      where: {
        type: 'talento',
        [Op.or]: [
          {
            nombre: {
              [Op.like]: `%${req.query.term}%`
            }
          },
          {
            apellido: {
              [Op.like]: `%${req.query.term}%`
            }
          },
          {
            username: {
              [Op.like]: `%${req.query.term}%`
            }
          }
        ]
      },
    }).then(users => {
      res.json(users);
    });
  }
});

router.get('/contacts', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.getBlocker().then(blockers => {
      let where = {}
      if (blockers.length) {
        where = {
            contactId: {
                [Op.notIn]: blockers.map(blocker => blocker.id)
            }
          }
      }
      user.getContact({
        through: {
          where: where
        },
        attributes: {
          exclude: ['email', 'password', 'acceptTerms']
        }
      }).then(users => {
        users.forEach(user => {
          user.lastContact = user.MessageContacts.updatedAt;
          // delete user['MessageContacts'];
        });
        notifier.resetNotifications('MESSAGE', req.user.id);
        users.sort(function(a, b) {
          return new Date(b.lastContact) - new Date(a.lastContact);
        });
        res.json(users);
      });
    });
  });
});

router.get('/contact/:id', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    models.User.findOne({
      where: {
        profile_url: req.params.id
      },
      attributes: {
        exclude: ['email', 'password', 'acceptTerms']
      }
    }).then(user => {
      res.json(user)
    });
  });
});

// Authenticated user information
router.get('/self', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id, {
    attributes: {
      exclude: ['password']
    }
  }).then(user => {
    const userProfile = getUserProfile(user.id);
    Promise.all([
      user,
      userProfile
    ]).then(results => {
      user.getFollower({
        through: {
          where: {
            followedId: req.user.id,
            createdAt: {
              [Op.gte] : new Date(new Date().setDate(new Date().getDate()-6)).toISOString().slice(0, 19).replace('T', ' ')
            }
          }
        }
      }).then(followers => {
        results[0].followersRecentCount = followers.length
        res.json({
          user: results[0],
          profile: results[1],
        });
      })
    }).catch(err => console.error(err));
  });
});

// AWS S3 profile/cover image upload
router.post('/aws-url', auth.isAuthenticated, (req, res, next) => {
  AWS.config.accessKeyId = env.aws_accessKeyId;
  AWS.config.secretAccessKey = env.aws_secretAccessKey;
  AWS.config.region = env.aws_region;

  let s3 = new AWS.S3();

  models.User.findById(req.user.id).then(user => {
    let oldImage = req.body.image_type === 'profile' ? user.profileImage : user.coverImage;
    let paths = oldImage.split('/');
    let imageName = paths[paths.length - 1];
    let delParams = {
      Bucket: env.aws_bucket,
      Key: `users/${req.user.username}/${imageName}`
    };
    s3.deleteObject(delParams, function(err, data) {
      if (err) console.log(err, err.stack);
      else     console.log(data);
    });
  });

  var params = {
    Bucket: env.aws_bucket,
    Key: `users/${req.user.username}/${req.body.filename}`,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg',
    Expires: 60,
    ACL: 'public-read'
  };
  s3.getSignedUrl('putObject', params, function (err, url) {
    res.json({url: url});
  });
});

// AWS S3 profile/cover image reset
router.post('/reset-image', auth.isAuthenticated, (req, res, next) => {
  AWS.config.accessKeyId = env.aws_accessKeyId;
  AWS.config.secretAccessKey = env.aws_secretAccessKey;
  AWS.config.region = env.aws_region;

  let s3 = new AWS.S3();

  models.User.findById(req.user.id).then(user => {
    let oldImage = req.body.image_type === 'profile' ? user.profileImage : user.coverImage;
    let paths = oldImage.split('/');
    let imageName = paths[paths.length - 1];
    let delParams = {
      Bucket: env.aws_bucket,
      Key: `users/${req.user.username}/${imageName}`
    };
    s3.deleteObject(delParams, function(err, data) {
      if (err) console.log(err, err.stack);
      else     console.log(data);
    });

    if(req.body.image_type === 'profile') {
      user.profileImage = `https://${env.aws_bucket}/users/default/profile.jpg`;
    } else {
      user.coverImage = `https://${env.aws_bucket}/users/default/cover.jpg`;
    }
    user.save();
    const token = generateToken(user);
    res.json({token: token});
  });
});

// Update profile/cover image modal
router.put('/modalChangeImage', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    if (req.body.type == 'profile') {
      user.profileImage = `${req.body.filename}`;
    } else {
      user.coverImage = `${req.body.filename}`;
    }
    user.save();
    const token = generateToken(user);
    res.json({token: token});
  });
});

// Update profile image url
router.put('/profile-image-url', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.profileImage = `https://${env.aws_bucket}/users/${req.user.username}/${req.body.filename}`;
    user.save();
    const token = generateToken(user);
    res.json({token: token});
  });
});

// Update cover image url
router.put('/cover-image-url', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.coverImage = `https://${env.aws_bucket}/users/${req.user.username}/${req.body.filename}`;
    user.save();
    const token = generateToken(user);
    res.json({token: token});
  });
});

// Get user profile
router.get('/:profile_url/profile', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: {profile_url: req.params.profile_url, type : 'talento'},
    attributes: {
      exclude: ['password', 'acceptTerms']
    }
  }).then(user => {
    if (!user) {
      return res.status(400).json({ error : 'noexists' });
    }
    
    if(req.user) {
      models.Category.findAll({
        attributes: ['id', 'slug', 'image'],
        include: [{
          model: models.CategoryTr,
          as: 'translations',
          attributes: ['name', 'description'],
          where: {
            langCode: 'es'
          }
        }]
      }).then(categories => {
        models.User.findById(user.id).then(user => {
          user.getCategories({
            attributes: ['id']
          }).then(interests => {
            const interestIds = interests.map(interest => interest.id);
            categories.map(category => {
              category.subscribed = interestIds.indexOf(category.id) >= 0;
              return category;
            });
            user.getFollower({
              through: {
                where: {
                  followerId: req.user.id
                }
              }
            }).then(followers => {
              user.following = followers.length > 0;
              models.UserProfile.findOne({
                where: {UserId : user.id}
              }).then(profile => {
                user.getBlocker({
                  through: {
                    where: {
                      blockerId: req.user.id
                    }
                  }
                }).then(blockers => {
                  user.isblocked = blockers.length > 0;
                  profile_info = {}
                  if (profile) {
                    profile_info = profile;
                  }
                  res.json({
                    user: user,
                    profile: profile_info,
                    categories: categories
                  });
                })
              });
            });
          });
        });
      });  
    } else {
      res.json(user);
    }
  }).catch(err => {
    res.status(500).json({ error : 'noexists' });
  });
});

router.get('/destacados', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    let page = req.query.page || 1
    let limit = 12
    let offset = limit * (page - 1)

    user.getBlocker().then(blockers => {
      let userId = {[Op.notIn]: [user.id]}
      if (blockers.length) {
        userId = {[Op.notIn]: [user.id, ...blockers.map(blocker => blocker.id)]} 
      } 
      if (user.type == 'agencia') {
        models.Interest.findAll({
          where: {
            userId: user.id
          }
        }).then(interests => {
          models.Interest.findAll({
            where: {
              categoryId: interests.map(row => row.categoryId),
              userId: userId
            }
          }).then(interestUsers => {
            if (req.query.page) {
              models.User.findAndCountAll({
                order: [['followersCount', 'DESC']],
                limit: limit,
                offset: offset,
                where: {
                  id: { [Op.in]: [...new Set(interestUsers.map(userRow => userRow.userId))] },
                  type: 'talento'
                },
                attributes: ['id', 'createdAt', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
              }).then(users => {
                res.json(users)
              })
            } else {
              models.User.findAll({
                order: [['followersCount', 'DESC']],
                limit: 8,
                where: {
                  id: { [Op.in]: [...new Set(interestUsers.map(userRow => userRow.userId))] },
                  type: 'talento'
                },
                attributes: ['id', 'createdAt', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
              }).then(users => {
                res.json(users)
              })
            }
          })
        })
      } else {
        if (req.query.page) {
          let where = {type: 'talento'}
          if (blockers.length) {
            where = {
              type: 'talento',
              id: {
                [Op.notIn]: blockers.map(blocker => blocker.id)
              }
            }
          }
          models.User.findAndCountAll({
            order: [['followersCount', 'DESC']],
            limit: limit,
            offset: offset,
            where: where,
            attributes: ['id', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
          }).then(users => {
            res.json(users)
          })
        } else {
          let where = {type: 'talento'}
          if (blockers.length) {
            where = {
              type: 'talento',
              id: {
                [Op.notIn]: blockers.map(blocker => blocker.id)
              }
            }
          }
          models.User.findAll({
            order: [['followersCount', 'DESC']],
            limit: 8,
            where: where,
            attributes: ['id', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
          }).then(users => {
            res.json(users)
          })
        }
      }    
    });    
  })
});

router.get('/recientes', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    let page = req.query.page || 1
    let limit = 12
    let offset = limit * (page - 1)

    user.getBlocker().then(blockers => {
      if (user.type == 'agencia') {
        models.Interest.findAll({
          where: {
            userId: user.id
          }
        }).then(interests => {
          let where = {
                categoryId: interests.map(row => row.categoryId),
                userId: {
                  [Op.notIn]: [user.id]
                }
              }
          if (blockers.length) {
            where = {
                categoryId: interests.map(row => row.categoryId),
                userId: {
                  [Op.notIn]: [user.id, ...blockers.map(blocker => blocker.id)]
                }
              }
          }
          models.Interest.findAll({
            where: where
          }).then(interestUsers => {
            if (req.query.page) {
              models.User.findAndCountAll({
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset,
                where: {
                  id: { [Op.in]: [...new Set(interestUsers.map(userRow => userRow.userId))] },
                  type: 'talento'
                },
                attributes: ['id', 'createdAt', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
              }).then(users => {
                res.json(users)
              })
            } else {
              models.User.findAll({
                order: [['createdAt', 'DESC']],
                limit: 8,
                where: {
                  id: { [Op.in]: [...new Set(interestUsers.map(userRow => userRow.userId))] },
                  type: 'talento'
                },
                attributes: ['id', 'createdAt', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
              }).then(users => {
                res.json(users)
              })
            }
          })
        })
      } else {
        let where = {type: 'talento'}
        if (blockers.length) {
          where = {
              type: 'talento',
              id: {[Op.notIn]: blockers.map(blocker => blocker.id)}
            }
        }
        if (req.query.page) {
          models.User.findAndCountAll({
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset,
            where: where,
            attributes: ['id', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
          }).then(users => {
            res.json(users)
          })
        } else {
          models.User.findAll({
            order: [['createdAt', 'DESC']],
            limit: 8,
            where: where,
            attributes: ['id', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
          }).then(users => {
            res.json(users)
          })
        }
      }
    });
  });
});

router.get('/similares', auth.isAuthenticated, (req, res, next) => {
   models.User.findById(req.user.id).then(user => {
     user.getBlocker().then(blockers => {
        if (user.type == 'agencia') {
          models.Interest.findAll({
            where: {
              userId: user.id
            }
          }).then(interests => {
            let where = {}
            if (interests.length) {
              where = {
                id : {
                  [Op.notIn]: [interests.map(row => row.categoryId)]
                }
              }
            }
            models.Category.findAll({
              where: where,
              attributes: ['id']
            }).then(categories => {
              let where = {
                    type: 'talento'
                  }
              if (blockers.length) {
                where = {
                    type: 'talento',
                    id: {
                      [Op.notIn]: [blockers.map(blocker => blocker.id)]
                    }
                  }
              }
              models.Interest.findAll({
                order: [[Sequelize.literal('RAND()')]], 
                limit: 10,
                group: 'userId',
                where: {
                  userId: {
                    [Op.ne]: req.user.id
                  },
                  categoryId: {
                    [Op.in]: categories.map(category => category.id)
                  }
                },
                include: [{
                  model: models.User,
                  as: 'user',
                  where: where,
                  attributes: ['id', 'username', 'profile_url', 'country', 'ciudad', 'type', 'nombre', 'apellido', 'fullname', 'profileImage']
                }]
              }).then(userInterest => {
                res.json(userInterest)
              });
            })
          })
        } else {
          user.getCategories({attributes: ['id']}).then(categories => {
            let where = {type: 'talento'}
            if (blockers.length) {
              where = {
                  type: 'talento',
                  id: {
                    [Op.notIn]: [blockers.map(blocker => blocker.id)]
                  }
                }
            }
            models.Interest.findAll({
              order: [[Sequelize.literal('RAND()')]], 
              limit: 10,
              where: {
                userId: {
                  [Op.ne]: req.user.id
                },
                categoryId: {
                  [Op.in]: categories.map(category => category.id)
                }
              },
              include: [{
                model: models.User,
                as: 'user',
                where: where,
                attributes: ['id', 'username', 'profile_url', 'country', 'ciudad', 'type', 'nombre', 'apellido', 'fullname', 'profileImage']
              }]
            }).then(userInterest => {
              res.json(userInterest)
            });
          })
        }
     })
  })
})

// Profile notifications update
router.post('/notifications', auth.isAuthenticated, (req, res, next) => {
    models.UserProfile.findOne({
      where: {
        UserId: req.user.id
      }
    }).then(UserProfile => {
      UserProfile[req.body.type] = req.body.status;
      UserProfile.save();
      models.User.findById(UserProfile.UserId).then(user => {
        const token = generateToken(user);
        res.json({token: token});
      });
    });
});

// Get user by username
router.get('/:username', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: {username: req.params.username},
    attributes: {
      exclude: ['email', 'password', 'acceptTerms']
    }
  }).then(user => {
    if(req.user) {
      user.getFollower({
        through: {
          where: {
            followerId: req.user.id
          }
        }
      }).then(followers => {
        user.following = followers.length > 0;
        models.UserProfile.findOne({
          where: {UserId : user.id}
        }).then(profile => {
          profile_info = {}
          if (profile) {
            profile_info = profile;
          }
          res.json({
            user: user,
            profile: profile_info
          });
        });
      });
    } else {
      res.json(user);
    }
  });
});

router.get('/agencia/following', auth.isAuthenticated, (req, res, next) => {
  let page = req.query.page || 1
  let limit = 12
  let offset = limit * (page - 1)

   models.User.findById(req.user.id).then(user => {
     user.getBlocker().then(blockers => {
      let where = {
          followerId: req.user.id
        }
      if (blockers.length) {
        where = {
          followerId: req.user.id,
          followedId: {
            [Op.notIn]: [blockers.map(blocker => blocker.id)]
          }
        }
      }
      models.Follower.findAndCountAll({
        limit: limit,
        offset: offset,
        where: where
      }).then(users => {
        followerIds = users.rows.map(row => row.followedId)
        models.User.findAll({
          where: {
            id: { [Op.in]: followerIds }
          },
          attributes: ['id', 'createdAt', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'country', 'ciudad', 'type']
        }).then(followers => {
          res.json({
            count: users.count,
            rows: followers
          })
        })
      })
     })
   })
});

router.get('/:username/following', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: {profile_url: req.params.username},
    attributes: {
      exclude: ['email', 'password', 'acceptTerms']
    }
  }).then(user => {
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
        },
        attributes: {
          exclude: ['email', 'password', 'acceptTerms']
        }
      }).then(users => {
        if(req.user) {
          models.User.findById(req.user.id).then(currentUser => {
            currentUser.getFollowed({
              through: {
                where: where
              }
            }).then(following => {
              users.forEach(user => {
                user.following = following.filter(f => f.id === user.id).length > 0;
              });
              res.json(users);
            });
          });
        } else {
          res.json(users);
        }
      });
    })
  });
});

router.get('/:username/followers', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: {profile_url: req.params.username},
    attributes: {
      exclude: ['email', 'password', 'acceptTerms']
    }
  }).then(user => {
    user.getBlocker().then(blockers => {
      let where = {}
      if (blockers.length) {
        where = {
            followerId: {
              [Op.notIn]: [blockers.map(blocker => blocker.id)]
            }
          }
      }
      user.getFollower({
        through: {
          where: where
        }
      }).then(users => {
        if(req.user) {
          models.User.findById(req.user.id).then(currentUser => {
            currentUser.getFollowed().then(following => {
              users.forEach(user => {
                user.following = following.filter(f => f.id === user.id).length > 0;
              });
              res.json(users);
            });
          });
        } else {
          res.json(users);
        }
      });    
    })
  });
});

// Check facebookid exists
router.get('/facebook-exists/:facebookid', (req, res, next) => {
  models.User.count({
    where: {isVerified: 1, facebookId: req.params.facebookid},
  }).then(c => {
    res.json({exists: c>0});
  });
});

// Check username exists
router.get('/username-exists/:username', (req, res, next) => {
  models.User.count({
    where: {username: req.params.username},
  }).then(c => {
    res.json({exists: c>0});
  });
});

// Check email exists
router.get('/email-exists/:email', (req, res, next) => {
  models.User.count({
    where: {email: req.params.email},
  }).then(c => {
    res.json({exists: c>0});
  });
});

// Check email user exists
router.get('/email-exists-user/:email', auth.isAuthenticated, (req, res, next) => {
  models.User.count({
    where: {email: req.params.email, id: {[Op.ne]: req.user.id}},
  }).then(c => {
    res.json({exists: c>0});
  });
});

// Signup Facebook
router.post('/facebook', (req, res, next) => {
  models.User.findOne({
		where: {
			facebookId: req.body.facebookId
		}
	}).then(existingUser => {
      if (existingUser) {
        const token = generateToken(existingUser);
        res.json({token: token, exists : true});
		  } else {
        var current_date = (new Date()).valueOf().toString();
        var random = Math.random().toString();
        models.User.create({
          profile_url: crypto.createHash('sha1').update(current_date + random).digest('hex'),
          nombre: req.body.first_name,
          apellido: req.body.last_name,
          facebookId: req.body.facebookId,
          username: req.body.facebookId,
          email: req.body.email,
          password: ' ',
          acceptTerms: true,
          isVerified: true
        }).then(user =>  {
          models.UserProfile.create({
            UserId: user.id
          }).then(profile => {
            const token = generateToken(user);
            res.json({token: token, exists : false});
          });
        }).catch(err => {
          res.status(500).json({ error : err.error });
        });
      }
  }).catch(err => {
    res.status(500).json({ error : err.error });
  });
});

// Finish signup wizard
router.put('/wizard', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.biography = req.body.biography;
    user.save();

    req.body.shareContats.forEach(function(element) {
        if (element != '') {
          fs.readFile(appRoot + '/views/templates/email-invitacion-'+ (req.body.lang ? req.body.lang : 'es') +'.html', 'utf-8', function(error, content) {
            content = content.replace(/#fullname/g, user.fullname);
            content = content.replace('#profileurl', 'https:\/\/' + env.host + '\/profile\/'+ user.profile_url);
            content = content.replace('#friendmail', element);
            var transporter = nodemailer.createTransport({
              host: env.smtp.host,
              port: env.smtp.port,
              secure: false,
              auth: {
                  user: env.smtp.username,
                  pass: env.smtp.password
              }
            });
            var mailOptions = { 
              from: env.emails.noreply, 
              to: element, 
              subject: (req.body.lang == 'en' ? 'Zhowit invitation' : 'Zhowit invitacion'), 
              html: content
            };
            transporter.sendMail(mailOptions, function (err) {
                //if (err) { 
                  //res.status(500).json({ msg: err.message }); 
                //}
            });
          });
        }
    });

    const token = generateToken(user);
    res.json({token: token});
  });
});

// Signup
router.post('/', (req, res, next) => {
  bcrypt.hash(req.body.password, 10)
    .then(hash => {
      var current_date = (new Date()).valueOf().toString();
      var random = Math.random().toString();
      var profileId = crypto.createHash('sha1').update(current_date + random).digest('hex');
      req.body.profile_url = uuidv4();
      req.body.password = hash;
      req.body.acceptTerms = true;
      models.User.create(req.body)
        .then(user =>  {
          models.UserProfile.create({
            UserId: user.id
          }).then(userProfile => {
            models.Token.create({
              UserId: user.id,
              type: 'signup',
              token: crypto.randomBytes(16).toString('hex')
            }).then(token => {
              fs.readFile(appRoot + '/views/templates/email-signup-'+ (req.body.langCode ? req.body.langCode : 'es') +'.html', 'utf-8', function(error, content) {
                content = content.replace('#fullname', user.fullname);
                content = content.replace('#email', user.email);
                content = content.replace('#link', 'https:\/\/' + env.host + '\/register/confirmation#' + token.token);
                var transporter = nodemailer.createTransport({
                  host: env.smtp.host,
                  port: env.smtp.port,
                  secure: false,
                  auth: {
                      user: env.smtp.username,
                      pass: env.smtp.password
                  }
                });
                var mailOptions = { 
                  from: env.emails.noreply, 
                  to: user.email, 
                  subject: (req.body.langCode == 'en' ? 'Zhowit account validation' : 'Zhowit verificación de cuenta'), 
                  html: content
                };
                transporter.sendMail(mailOptions, function (err) {
                    if (err) { 
                      res.status(500).json({ msg: err.message }); 
                    } else {
                      const token = generateToken(user);
                      res.json({
                        token: token
                      });
                    }
                });
              });
            }).catch(function(err) {
              res.status(500).json({ error : err.errors });
            });
          }).catch(function(err) {
            console.log(err.errors)
          });
        }).catch(function(err) {
            res.status(500).json({ error : err.errors });
        });
    });
});

// Validation signup
router.get('/confirmation/:token', (req, res, next) => {
  models.Token.findOne({
    where: {token: req.params.token, type: 'signup'}
  }).then(token => {
      if (!token) return res.status(400).json({ msg: 'User already validated' })
      models.User.findById(token.UserId).then(user => {
        user.isVerified = 1;
        user.save();
        res.status(200).json({token:generateToken(user)});
        token.destroy();
      }).catch(err => {
        res.status(500).json({ error: 'User not found.' });
      });
  }).catch(err => {
    res.status(500).json({ error: 'Token not found.' });
  });
});

// Recover username
router.post('/recover/username', auth.isGuest, (req, res, next) => {
  models.User.findOne({
    where: {
      email: req.body.email 
    },
    attributes: ['email', 'username']
  }).then(user => {
    if (!user) {
      res.status(500).json({error: 'User not found.'});
    } else {
      fs.readFile(appRoot + '/views/templates/email-recover_username-'+ (req.body.lang ? req.body.lang : 'es') +'.html', 'utf-8', (err, content) => {
        content = content.replace('#username', user.username);
        var transporter = nodemailer.createTransport({
          host: env.smtp.host,
          port: env.smtp.port,
          secure: false,
          auth: {
            user: env.smtp.username,
            pass: env.smtp.password,
          }
        });
        var mailOptions = {
          from: env.emails.noreply,
          to: user.email,
          subject: 'Account username recover',
          html: content
        };
        transporter.sendMail(mailOptions, (err) => {
          if (err) {
            return res.status(500).json({ error : err.message });
          } else {
            return res.json({
              msg: `A verification email has been sent to ${user.email}.`
            });
          }
        });
      });
    }    
  });
});

// Recover password
router.post('/recover/password', auth.isGuest, (req, res, next) => {
  models.User.findOne({
    where: {
      email: req.body.email,
      isVerified: 1
    },
    attributes: ['id', 'email', 'isVerified', 'nombre', 'apellido']
  }).then(user => {
    if (!user) return res.status(400).json({error: 'user'});
    if (!user.isVerified) return res.status(400).json({error: 'validated'});
    models.Token.create({
      UserId: user.id,
      type: 'recover',
      token: crypto.randomBytes(16).toString('hex')
    }).then(token => {
      fs.readFile(appRoot + '/views/templates/email-recover_password-'+ (req.body.lang ? req.body.lang : 'es') +'.html', 'utf-8', function(error, content) {
        content = content.replace('#fullname', user.nombre+' '+user.apellido);
        content = content.replace('#email', user.email);
        content = content.replace('#link', 'https:\/\/' + env.host + '\/forgot\/' + token.token);
        var transporter = nodemailer.createTransport({
          host: env.smtp.host,
          port: env.smtp.port,
          secure: false,
          auth: {
              user: env.smtp.username,
              pass: env.smtp.password
          }
        });
        var mailOptions = { 
          from: env.emails.noreply, 
          to: user.email, 
          subject: req.body.lang == 'en' ? 'Forgot my password' : 'Olvide mi contraseña', 
          html: content
        };
        transporter.sendMail(mailOptions, function (err) {
            if (err) { 
              return res.status(400).json({ error: 'email' }); 
            } else {
              return res.json({
                msg: 'A verification email has been sent'
              });
            }
        });
      });
    });
  });
});

// Resend signup validation
router.post('/resend-validation', auth.isGuest, (req, res, next) => {
  models.User.findById(req.body.id).then(user => {
    if (user) {
      models.Token.findOne({
        where: {UserId: user.id, type: 'signup'}
      }).then(token => {
          if (!token) return res.status(400).json({ msg: 'User already validated' })
          fs.readFile(appRoot + '/views/templates/email-signup-'+ (req.body.lang ? req.body.lang : 'es') +'.html', 'utf-8', function(error, content) {
            content = content.replace('#fullname', user.fullname);
            content = content.replace('#email', user.email);
            content = content.replace('#link', 'https:\/\/' + env.host + '\/register\/confirmation#' + token.token);
            var transporter = nodemailer.createTransport({
              host: env.smtp.host,
              port: env.smtp.port,
              secure: false,
              auth: {
                  user: env.smtp.username,
                  pass: env.smtp.password
              }
            });
            var mailOptions = { 
              from: env.emails.noreply, 
              to: user.email, 
              subject: req.body.lang == 'en' ? 'Zhowit account validation' : 'Zhowit verificación de cuenta', 
              html: content
            };
            transporter.sendMail(mailOptions, function (err) {
                if (err) { 
                  res.status(500).json({ msg: err.message }); 
                } else {
                  const token = generateToken(user);
                  res.json({
                    token: token
                  });
                }
            });
          });
      }).catch(err => {
        res.status(400).json({ error: 'Token not found.' });
      });
    } else {
      res.status(400).json({
        error: 'User not found'
      });
    }
  }).catch(err => {
    res.status(500).json({ error : err.errors });
  });
});

// Recover password validate
router.get('/recover/:token', auth.isGuest, (req, res, next) => {
  models.Token.findOne({ 
    where: { token : req.params.token, type : 'recover' } 
  }).then(token_recover => {
    if (token_recover) {
      models.User.findOne({ 
        where: {
          id: token_recover.UserId
        },
        attributes: ['id', 'email', 'username', 'password', 'profileImage', 'langCode']
      }).then(user => {
        token_recover.destroy();
        const token = generateToken(user);
        res.json({token: token});
      });
    } else {
      res.status(400).json({
        error: 'token'
      });
    }
  });
});

// Facebook Login
router.post('/fbauthenticate', (req, res, next) => {
  models.User.findOne({
    where: {
      isVerified: 1,
      facebookId: req.body.facebookId
    },
    attributes: ['id', 'email', 'username', 'password', 'profileImage', 'langCode']
  }).then(user => {
    if(user) {
      const token = generateToken(user);
      res.json({token: token});
    } else {
      res.status(400).json({error: 'User not found or not validated.'});
    }
  }).catch(err => {
    res.status(500).json({error: 'User not found or not validated.'});
  });
});

// Login
router.post('/authenticate', (req, res, next) => {
  req.assert('email', 'required').notEmpty();
  req.assert('password', 'required').notEmpty();

  var errors = req.validationErrors(true);
  if (errors) return res.status(400).json({error: errors});

  models.User.findOne({
    where: {
      isVerified: 1,
      email: req.body.email
    },
    attributes: ['id', 'email', 'username', 'password', 'profileImage', 'langCode']
  }).then(user => {
    if(user) {
      bcrypt.compare(req.body.password, user.password).then(match => {
        if(match) {
          const token = generateToken(user);
          res.json({token: token});
        } else {
          res.status(400).json({error: 'password'});
        }
      })
      .catch(err => {
        res.status(400).json({error: err});
      });
    } else {
      res.status(400).json({error: 'credentials'});
    }
  }).catch(err => {
      res.status(400).json({error: err});
  });
});

// Block User
router.post('/block', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(blocker => {
    models.User.findById(req.body.userId)
    .then(user =>  {
      blocker.addBlocker(user.id).then(() => {
        user.addBlocker(req.user.id).then(block => {
          user.removeFollower(req.user.id);
          blocker.removeFollower(user.id);
          res.json(block);
        });
      })
    });
  });
});

// Follow User
router.post('/follow', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(follower => {
    models.User.findById(req.body.id)
    .then(user =>  {
      follower.increment(`followingCount`);
      user.increment(`followersCount`);
      notifier.notification(req.app.io, 'FOLLOWER', user.id, follower.id);
      user.addFollower(req.user.id).then(follower => {
        res.json(follower);
      });
    });
  });
});

// Unfollow User
router.post('/unfollow', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(follower => {
    models.User.findById(req.body.id)
    .then(user =>  {
      follower.decrement(`followingCount`);
      user.decrement(`followersCount`);
      user.removeFollower(req.user.id).then(follower => {
        res.json(follower);
      });
    });
  });
});

// Profile update
router.put('/', auth.isAuthenticated, updateProfile);

// Profile update account type
router.put('/profile', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.type = req.body.profile;
    if (req.body.profile == 'agencia') {
      //user.profile_url = null
    }
    user.save();
    const token = generateToken(user);
    res.json({token: token});
  });
});

// Profile url update
router.put('/profile_url', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
      models.User.findOne({
        where: { 
          profile_url: req.body.profile_url, 
          id: { [Op.ne]: req.user.id } 
        }
      }).then(user_profile => {
        if (user_profile) {
          res.status(400).json({
            msg: 'Profile url already exists, please choose a different.'
          })
        } else {
          user.profile_url = req.body.profile_url;
          user.save();
          const token = generateToken(user);
          res.json({
            token: token,
            msg: 'Profile url updated successfully'
          });
        }
      });
  });
});

// Password update
router.put('/password', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    //bcrypt.compare(req.body.currentPassword, user.password).then(match => {
      //if(match) {
        bcrypt.hash(req.body.newPassword, 10).then(hash => {
          user.password = hash;
          user.save();
          res.json({success: true});
        });
      /*} else {
        res.status(422);
        res.json({
          type: 'invalid-password'
        });
      }*/
    //}).catch(err => {throw err;});
  });
});

router.put('/language', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id).then(user => {
    user.langCode = req.body.langCode;
    user.save();
    const token = generateToken(user);
    res.json({token: token});
  });
});

// Get user details by id and type
router.get('/:id/:type', auth.decode, (req, res, next) => {
  models.User.findOne({
    where: {id: req.params.id, type: req.params.type},
    attributes: {
      exclude: ['email', 'password', 'acceptTerms']
    }
  }).then(user => {
    user.getFollower({
      through: {
        where: {
          followerId: req.user.id
        }
      }
    }).then(followers => {
      user.following = followers.length > 0;
      models.UserProfile.findOne({
        where: {UserId : user.id}
      }).then(profile => {
        profile_info = {}
        if (profile) {
          profile_info = profile;
        }
        res.json({
          user: user,
          profile: profile_info
        });
      });
    });
  });
});

module.exports = router;