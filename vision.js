/*
 * --------------------------------------------------------
 * Enviornment setup
 * --------------------------------------------------------
 */
var express = require('express');
var https = require('https');
var fs = require('fs');
var passport = require('passport');
var DigestStrategy = require('passport-http').DigestStrategy;
var dotenv = require('dotenv');
var bodyparser = require('body-parser');
var methodoverride = require('method-override');
dotenv.load();
console.log("Couchbase server  :" + process.env.clouddb_server);
console.log("Couchbase username:" + process.env.clouddb_username);
console.log("Couchbase password:" + process.env.clouddb_password);
console.log("Couchbase bucket  :" + process.env.clouddb_name);

HTTP_PORT=process.env.api_http_port;
HTTPS_PORT=process.env.api_https_port;
SERVICE_PREFIX='/rest';
MISSING_PARAM='Missing parameter';
var ENABLE_DEBUG = true;

/*
 * --------------------------------------------------------
 * Setup server log
 * --------------------------------------------------------
 */
if(!fs.existsSync('logs')){
  console.log("Log folder not exist, create it.\n");
  fs.mkdirSync('logs', 0775, function(err){
    if(err){
      console.log("Log folder create failure.\n");
    }
  });
}
var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: __dirname + '/log/debug.log', json: false })
  ],
  exceptionHandlers: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: __dirname + '/log/exceptions.log', json: false })
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
/*
 * --------------------------------------------------------
 * Setup User account
 * --------------------------------------------------------
 */

var users = [
    { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' }
  , { id: 2, username: 'joe', password: 'birthday', email: 'joe@example.com' }
];

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}


passport.use(new DigestStrategy({ qop: 'auth' },
  function(username, done) {
    // Find the user by username.  If there is no user with the given username
    // set the user to `false` to indicate failure.  Otherwise, return the
    // user and user's password.
    findByUsername(username, function(err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      return done(null, user, user.password);
    })
  },
  function(params, done) {
    // asynchronous validation, for effect...
    process.nextTick(function () {
      // check nonces in params here, if desired
      return done(null, true);
    });
  }
));

/*
 * --------------------------------------------------------
 * Server main
 * --------------------------------------------------------
 */

var register = function(app){
  app.use(passport.initialize());
  app.use(bodyparser());
  app.use(function(req, res, next){
    console.log('%s %s', req.method, req.url);
    next();
  });
/*
 * ==================================================
 *             User login API
 * ==================================================
 */
  app.get(SERVICE_PREFIX + '/login', function(req, res){
    res.send(200);
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
register(http);
http.listen(HTTP_PORT);

var options = {
  key: fs.readFileSync(__dirname + "/ssl.key"),
  cert: fs.readFileSync(__dirname + "/ssl.cert")
};
https.createServer(options, http).listen(HTTPS_PORT);
