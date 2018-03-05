var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var db = require('./utils/db');

var main = require('./routes/main');
var users = require('./routes/users');

//AUTH STUFF
var jwt = require('jwt-simple');
var secret = '39t7cb3tq48xmd49386q7b3vv698c5wm8536b7';


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', main);
app.use('/users', users);

app.post('/auth', (req, res) =>{
   console.dir(req.body.mode == "Sign In");
   if(req.body.mode == "Sign In"){
     db.getClient().query('SELECT id FROM users WHERE email = $1 AND hash = $2', [req.body.email, req.body.password], (err, response) => {
       if(response.rows[0]){
         var token = jwt.encode({id: response.rows[0].id}, secret);
         res.cookie('auth', token);
         res.redirect('users/' + response.rows[0].id);
       }else{
         res.render('auth', {failed: true})
       }
     });
   }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = {app: app, jwt:jwt, secret: secret};
