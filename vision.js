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
dotenv.load();
console.log("Database server  :" + process.env.clouddb_server);
console.log("Database username:" + process.env.clouddb_username);
console.log("Database password:" + process.env.clouddb_password);
console.log("Database bucket  :" + process.env.clouddb_name);
FACEBOOK_APP_ID=process.env.facebook_app_id;
FACEBOOK_APP_SECRET=process.env.facebook_app_key;
HTTP_PORT=process.env.api_http_port;
HTTPS_PORT=process.env.api_https_port;
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
var mysql = require('mysql');
var pool  = mysql.createPool({
  host     : process.env.clouddb_server,
  user     : process.env.clouddb_username,
  password : process.env.clouddb_password,
  database : process.env.clouddb_name
});
pool.getConnection(function(err, connection){
  if(err){
    logger.error("Connect to MySQL error: " + err);
  }else{
    logger.info("Connected to MySQL!");
  }
});
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
  app.set('views', __dirname + '/views');
  app.engine('html', require('ejs').renderFile);
  app.get('/auth/facebook', passport.authenticate('facebook', { scope : ['email'] }));
  app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));

  app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));
  app.get('/auth/google/return',
    passport.authenticate('google', {
                                    failureRedirect: '/login' }),
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
    console.log("[" + JSON.stringify(req.user) + "]");
    res.send(200, "Hello " + req.user.displayName);
    //res.render('index.html');
  });
/*
 * ==================================================
 *             User login API
 * ==================================================
 */
  app.get('/login', function(req, res){
    res.render('login.html');
  });
/*
 * ==================================================
 *             User registration API
 * ==================================================
 */
  app.post(SERVICE_PREFIX + '/register', function(req, res){
    res.send(200);
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
