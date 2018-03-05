var express = require('express');
var router = express.Router();
var db = require('../utils/db');

/* GET home page. */
router.get('/', function(req, res, next) {

  res.render('auth', {failed: false});
});

module.exports = router;
