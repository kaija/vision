/*
 * --------------------------------------------------------
 * Enviornment setup
 * --------------------------------------------------------
 */
var express = require('express');
var https = require('https');
var fs = require('fs');
var DigestStrategy = require('passport-http').DigestStrategy;
var dotenv = require('dotenv');
var bodyparser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var methodoverride = require('method-override');
var neo4j = require('neo4j-js');
var user = require('./user.js');
var md5 = require('MD5');
dotenv.load();
console.log("Database server  :" + process.env.clouddb_server);
console.log("Database username:" + process.env.clouddb_username);
console.log("Database password:" + process.env.clouddb_password);
console.log("Database bucket  :" + process.env.clouddb_name);
FACEBOOK_APP_ID=process.env.facebook_app_id;
FACEBOOK_APP_SECRET=process.env.facebook_app_key;
HTTP_PORT=process.env.api_http_port;
HTTPS_PORT=process.env.api_https_port;

DB_SERVER=process.env.clouddb_server
DB_NAME=process.env.clouddb_name
DB_USERNAME=process.env.clouddb_username
DB_PASSWORD=process.env.clouddb_password

SERVICE_PREFIX='/rest';
MISSING_PARAM='Missing parameter';
var ENABLE_DEBUG = true;
var log_path='/var/log/vision'

/*
 * --------------------------------------------------------
 * Setup server log
 * --------------------------------------------------------
 */
if(!fs.existsSync(log_path)){
  console.log("Log folder not exist, create it.\n");
  fs.mkdirSync(log_path, 0775, function(err){
    if(err){
      console.log("Log folder create failure.\n");
    }
  });
}
var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: log_path + '/debug.log', json: false })
  ],
  exceptionHandlers: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: log_path + '/exceptions.log', json: false })
  ],
  exitOnError: false
});

module.exports = logger;
var time = new Date();

logger.info("Server start at " + time + " with HTTP(" + HTTP_PORT +") HTTPS(" + HTTPS_PORT +")" );

/*
 * --------------------------------------------------------
 * Database Setup
 * --------------------------------------------------------
 */
var cloudant_server = 'https://' + DB_USERNAME + ':' + DB_PASSWORD + '@' + DB_SERVER + '/' + DB_NAME;
console.log(cloudant_server);
var nano = require('nano')(cloudant_server);
//var db = nano.use(DB_NAME);
/*
nano.list(function(err, body){
    if(err){
        throw new Error(error);
    }else{
        console.log(body);
    }
});
*/


/*
 * --------------------------------------------------------
 * Oauth Setup
 * --------------------------------------------------------
 */

var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy
  , GoogleStrategy = require('passport-google').Strategy;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "https://ibeacon.securepilot.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    logger.info("Access Token:" + accessToken + " refresh token:" + refreshToken + " profile:" + JSON.stringify(profile));
    process.nextTick(function () {
      return done(null, profile);
      //var user = {};
      //user['name'] = profile.displayName;
      //console.log(user);
    });
  }
));

passport.use(new GoogleStrategy({
    returnURL: 'https://ibeacon.securepilot.com/auth/google/return',
    realm: 'https://ibeacon.securepilot.com/',
    stateless: true
  },
  function(identifier, profile, done) {
    logger.info("identifier:" + identifier + " profile:" + JSON.stringify(profile));
    process.nextTick(function () {
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      return done(null, profile);
    });
  }
));

passport.use(new DigestStrategy({ qop: 'auth', realm: 'MAIL' }, function(username, done) {
  console.log(username + 'try to login');
  nano.view('email', 'email', {keys:[username]} , function(err, doc){
    if(err){
        return done(null, false);
    }
    console.log(doc);
    if(doc.rows.length == 0){
        return done(null, false);
    }
    nano.get(doc.rows[0].id, { revs_info: true }, function(err, body){
      if(err){
        return done(null, false);
      }
      console.log(body);
      var password = {};
      password.ha1 = body.password;
      return done(null, body, password);
    });
  });
}));

/*
 * --------------------------------------------------------
 * Server main
 * --------------------------------------------------------
 */

var register = function(app, passport){
  app.use(bodyparser());
  app.use(cookieParser());
  app.use(session({ secret: 'slogon'}));
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(function(req, res, next){
    console.log('%s %s', req.method, req.url);
    next();
  });
  app.use(express.static(__dirname + '/views/stylish'));
  app.set('views', __dirname + '/views/stylish');
  app.engine('html', require('ejs').renderFile);
  app.get('/auth/facebook', passport.authenticate('facebook', { scope : ['email'] }));
  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/oauth_login' }));

  app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));
  app.get('/auth/google/return',
    passport.authenticate('google', {
                                    failureRedirect: '/oauth_login' }),
    function(req, res){
      console.log(req);
      res.redirect('/');
    }
  );
/*
 * ==================================================
 *             Root page
 * ==================================================
 */
  app.get('/', function(req, res){
    //console.log("[" + JSON.stringify(req.user) + "]");
    //res.send(200, "Hello " + req.user.displayName);
    res.render('index.html');
  });
/*
 * ==================================================
 *             User login API
 * ==================================================
 */
  app.post(SERVICE_PREFIX + '/login',
    passport.authenticate('digest', { session: false }),
      function(req, res){
        var user = {};
        res.send(200, req.user);
      }
  );
  app.get(SERVICE_PREFIX + '/login',
    passport.authenticate('digest', { session: false }),
      function(req, res){
        res.send(200, req.user);
      }
  );
/*
 * ==================================================
 *             User profile update
 * ==================================================
 */
  app.post(SERVICE_PREFIX + '/user_update',
    passport.authenticate('digest', { session: false }),
      function(req, res){
        if(req.body.name) req.user.name = req.body.name;
        if(req.body.last_name) req.user.last_name = req.body.last_name;
        if(req.body.first_name) req.user.first_name = req.body.first_name;
        if(req.body.user_type) req.user.user_type = req.body.user_type;
        if(req.body.password) req.user.password = md5(req.user +':MAIL:'+ req.body.password);
        if(req.body.birthday) req.user.birthday = req.body.birthday;
        if(req.body.address) req.user.address = req.body.address;
        if(req.body.gender) req.user.gender = req.body.gender;
        if(req.body.locale) req.user.locale = req.body.locale;
        if(req.body.tz_offset) req.user.tz_offset = req.body.tz_offset;
        if(req.body.tz_name) req.user.tz_name = req.body.tz_name;
        if(req.body.dst_offset) req.user.dst_offset = req.body.dst_offset;
        nano.insert(req.user, req.user._id, function(err, body){
          console.log(body);
          return res.send(200, "Update success");
        });
  });
/*
 * ==================================================
 *             User registration API
 * ==================================================
 */
  app.post(SERVICE_PREFIX + '/register', function(req, res){
    var u = user.user_create();
    if(req.body.name) u.set_name(req.body.name);
    if(req.body.email) u.set_email(req.body.email);
    if(req.body.last_name) u.set_last_name(req.body.last_name);
    if(req.body.first_name) u.set_first_name(req.body.first_name);
    if(req.body.user_type) u.set_user_type(req.body.user_type);
    if(req.body.password) u.set_password(req.body.password);
    if(req.body.token) u.set_token(req.body.token);
    if(req.body.fb_token) u.set_fb_token(req.body.fb_token);
    if(req.body.google_token) u.set_google_token(req.body.google_token);
    if(req.body.birthday) u.set_birthday(req.body.birthday);
    if(req.body.address) u.set_address(req.body.address);
    if(req.body.gender) u.set_gender(req.body.gender);
    if(req.body.locale) u.set_locale(req.body.locale);
    if(req.body.tz_offset) u.set_tz_offset(req.body.tz_offset);
    if(req.body.tz_name) u.set_tz_name(req.body.tz_name);
    if(req.body.dst_offset) u.set_dst_offset(req.body.dst_offset);
    nano.view('email', 'email', {keys:[req.body.email]} , function(err, doc){
      if(!err){
        if(doc.rows.length == 0){
          nano.insert(u.val, null, function(err, body){
            if(!err)
            {
              console.log(body)
              res.send(200, body);
            }
          });
        }else{
          res.send(200, "user already exist\n");
        }
      }else{
          console.log(err);
        res.send(500, "database view error\n");
      }
    });
  });

/*
 * ==================================================
 *             Update user's tracking
 * ==================================================
 */

  app.post(SERVICE_PREFIX + '/user_track', function(req, res){
      res.send(200);
  });
};

var http = express();
register(http, passport);
http.listen(HTTP_PORT);

var options = {
  key: fs.readFileSync(__dirname + "/ssl.key"),
  cert: fs.readFileSync(__dirname + "/ssl.cert")
};
https.createServer(options, http).listen(HTTPS_PORT);
