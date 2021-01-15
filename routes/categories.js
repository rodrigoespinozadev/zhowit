var models  = require('../models');
var express = require('express');
var router = express.Router();
let auth = require('./../middlewares/auth');
const Op = models.Sequelize.Op;

router.get('/', (req, res, next) => {
  models.Category.findAll().then(categories => {
    res.json(categories);
  });
});

router.get('/:langCode', (req, res, next) => {
  models.CategoryTr.findAll({
    where: {
      langCode: req.params.langCode
    },
    attributes: [['categoryId', 'id'], 'name']
  }).then(categories => {
    res.json(categories);
  });
});

router.get('/:langCode/full', (req, res, next) => {
  models.Category.findAll({
    attributes: ['id', 'slug', 'image'],
    include: [{
      model: models.CategoryTr,
      as: 'translations',
      attributes: ['name', 'description'],
      where: {
        langCode: req.params.langCode
      }
     }]
  }).then(categories => {
    res.json(categories);
  });
});

router.get('/users/:slug', (req, res, next) => {
  if (req.params.slug != 'all') {
    models.Category.findOne({
      where: {
        slug: req.params.slug
      },
      attributes: ['id']
    }).then(category => {
      let page = req.query.page || 1
      let limit = 12
      let offset = limit * (page - 1)
      let where = { type: 'talento'}

      if (req.query.country) {
        where.country = req.query.country
      }
      
      models.Interest.findAndCountAll({
        where: {
          categoryId: category.id
        },
        limit: limit,
        offset: offset,
        include:[{
          where: where,
          model: models.User,
          as: 'user',
          attributes: ['id', 'country', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'type']
        }]
      }).then(interes => {
        res.json(interes)
      });
    })
  } else {
    let page = req.query.page || 1
    let limit = 12
    let offset = limit * (page - 1)
    let where = {}

    if (req.query.country) {
      where = {
        country: req.query.country
      }
    }

    models.User.findAndCountAll({
      where: where,
      limit: limit,
      offset: offset,
      attributes: ['id', 'country', 'username', 'profile_url', 'nombre', 'apellido', 'fullname', 'profileImage', 'coverImage', 'type']
    }).then(users => {
      let usersFormated = []

      users.rows.forEach(user => {
        usersFormated.push({
          user: user
        })
      })

      res.json({
        'count': users.count,
        'rows': usersFormated
      })
    });
  }
})


router.get('/:langCode/:slug', (req, res, next) => {
  models.Category.findOne({
    where: {
      slug: req.params.slug
    },
    attributes: ['id', 'slug', 'image'],
    include: [{
      model: models.CategoryTr,
      as: 'translations',
      attributes: ['name', 'description'],
      where: {
        langCode: req.params.langCode
      }
     }]
  }).then(category => {
    res.json(category);
  });
});

// Get user subscribed catagories
router.get('/:langCode/full/subscribed', auth.isAuthenticated, (req, res, next) => {
  models.Category.findAll({
    attributes: ['id', 'slug', 'image'],
    include: [{
      model: models.CategoryTr,
      as: 'translations',
      attributes: ['name', 'description'],
      where: {
        langCode: req.params.langCode
      }
    }]
  }).then(categories => {
    models.User.findById(req.user.id).then(user => {
      user.getCategories({
        attributes: ['id']
      }).then(interests => {
        const interestIds = interests.map(interest => interest.id);
        categories.map(category => {
          category.subscribed = interestIds.indexOf(category.id) >= 0;
          return category;
        });
        res.json(categories);
      });
    });
  });  
});

// Subscribe user to category
router.post('/subscribe', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id)
    .then(user => {
      user.addCategory(req.body.categoryId).then(interest => {
        res.json(interest);
      });
    })
});

// Unsubscribe user to category
router.post('/unsubscribe', auth.isAuthenticated, (req, res, next) => {
  models.User.findById(req.user.id)
  .then(user => {
    user.removeCategory(req.body.categoryId).then(interest => {
      res.json(interest);
    });
  })
});

module.exports = router;
