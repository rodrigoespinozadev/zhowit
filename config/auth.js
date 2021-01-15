var passport = require("passport");
var crypto = require('crypto');
var FacebookStrategy = require("passport-facebook").Strategy;
var models  = require('../models');
const env = require('../config/env');

var facebookConfig = {
	clientID : env.facebook.client_id,
	clientSecret : env.facebook.cliente_secret,
	callbackURL : env.facebook.callback_url,
	passReqToCallback : true
};

var facebookInit = function(req, token, refreshToken, profile, callback) {
	models.User.findOne({
		where: {
			facebookId: profile.id
		}
	}).then(existingUser => {
		if (existingUser) {
			return callback(null, existingUser);
		} else {
			var current_date = (new Date()).valueOf().toString();
      		var random = Math.random().toString();
			models.User.create({
				profile_url: crypto.createHash('sha1').update(current_date + random).digest('hex'),
				acceptTerms: true,
				fullname: profile.displayName,
				facebookId: profile.id,
				username: 'facebook-' + profile.id,
				email: 'facebook@'+profile.id,
				password: ' ',
				isVerified: true
			}).then(user =>  {
				return callback(null, user);
			});
		}
	}).catch(err => {
		return callback(err);
	});
};

passport.use(new FacebookStrategy(facebookConfig, facebookInit));

passport.serializeUser(function(user, callback) {
	callback(null, user.id);
});

passport.deserializeUser(function(id, callback) {
	User.findById(id, function(err, user) {
		callback(err, user);
	});
});

module.exports = {
	facebook : {
		login: passport.authenticate("facebook", { scope: "email" }),
		callback: passport.authenticate("facebook", {
			//successRedirect : "/profile",
			failureRedirect : "/"
		}),
		connect: passport.authorize("facebook", { scope: "email" }),
		connectCallback: passport.authorize("facebook", {
			successRedirect : "/profile",
			failureRedirect : "/profile"
		}),
		disconnect : function(req, res, next) {
			var user = req.user;
			
			user.facebook.id = undefined;			
			user.facebook.email = undefined;
			user.facebook.token = undefined;
			
			user.save(function(err) {
				next();
			});
		}
	}
};