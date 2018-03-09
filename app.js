var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var db = require('./utils/db');
var verify = require('./utils/verify');

var main = require('./routes/main');
var users = require('./routes/users');
var items = require('./routes/items');

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
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('*', (req, res, next) => {
    if (req.cookies.auth) {
        var user;
        try {
            user = jwt.decode(req.cookies.auth, secret);
        } catch (err) {
            console.dir(err);
            res.clearCookie('auth');
            res.sendStatus(309);
        }
        if (user) {
            req['user'] = user;
            console.dir(user);
            next();
        }
    } else {
        next();
    }
});

app.use('/', main);
app.use('/users', verify.HAS_VALID_USER, users);
app.use('/items', verify.HAS_VALID_USER, items);

app.get('/app', verify.HAS_VALID_USER, (req, res) => {
    // Get user items to populate starting template.
    var date = new Date();
    var userID = req.user.id;
    db.getClient().query('SELECT * FROM items_protos WHERE month = $1 and year = $2 and user_id = $3', [date.getMonth(), date.getFullYear(), userID], (err, response) => {
        res.render('main', {date: date, items: response.rows});
    });
});

app.post('/auth', (req, res) => {
    if (req.body.mode == 'Sign In') {
        db.getClient().query('SELECT id FROM users WHERE email = $1 AND hash = $2', [req.body.email, req.body.password], (err, response) => {
            if (response.rows[0]) {
                sendToken(res, response.rows[0].id);
            } else {
                res.render('auth', {failed: true, message: 'Sorry, that\'s incorrect'});
            }
        });
    } else {
        db.getClient().query('SELECT * from users where email = $1', [req.body.email], (err, response) => {
            if (!err) {
                if (response.rows.length != 0) {
                    console.dir('here');
                    res.render('auth', {failed: true, message: 'Sorry, an account with that email address exists.'});
                } else {
                    db.getClient().query('INSERT INTO users(email, hash) VALUES($1, $2) RETURNING id', [req.body.email, req.body.password], (err, response) => {
                        if (!err) {
                            sendToken(res, response.rows[0].id);
                        } else {
                            console.dir('here lol');
                            console.dir(err);
                            res.sendStatus(500);
                        }
                    });
                }
            } else {
                console.dir('here');
                console.dir(err);
                res.sendStatus(500);
            }
        });
    }
});
app.post('/auth/logout', (req, res) => {
   res.clearCookie('auth');
   res.redirect('/');
});

function sendToken(res, id) {
    var token = jwt.encode({id: id}, secret);
    res.cookie('auth', token);
    res.redirect('app');
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = {app: app, jwt: jwt, secret: secret};
