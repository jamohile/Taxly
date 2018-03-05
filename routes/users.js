var express = require('express');
var router = express.Router({mergeParams: true});
var db = require('../utils/db');

var items = require('./items');

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

router.get('/:userID', (req, res) => {
    // Get user items to populate starting template.
    var date = new Date();
    var userID = req.params.userID;

    db.getClient().query('SELECT * FROM items_protos WHERE month = $1 and year = $2 and user_id = $3', [date.getMonth(), date.getFullYear(), userID], (err, response) => {
        res.render('main', {date: date, items: response.rows})
    });
})
router.use('/:userID/items', items);

module.exports = router;
