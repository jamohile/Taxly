var express = require('express');
var router = express.Router({mergeParams: true});


var verify = require('../utils/verify');
var db = require('../utils/db');

var app = require('../app');

/*
/*
GET all item prototypes for the user. Returns formatted HTML
*/
/*
GET all items for a given month and year.

Accepts query params: month (0 based) and year (1 based)
 */
router.get('/', (req, res) => {
    var date = new Date();
    var month = req.query.month ? req.query.month : date.getMonth();
    var year = req.query.year ? req.query.year : date.getFullYear();
    var userID = req.user.id;
    console.dir(userID);
    // Join Item with properties from the proto.
    db.getClient().query('select * from items_protos WHERE month = $1 and year = $2 and user_id = $3', [month, year, userID], (err, response) => {
            if (err) {
                console.dir(err);
                res.sendStatus(500);
            } else {
                /*
                Send HTML formatted rows of data.
                 */
                var items = response.rows;
                db.getClient().query('SELECT to_json(addDefaultItems($1, $2, $3))', [userID, month, year], (err, response) => {
                    if (err) {
                        console.dir(err);
                        res.sendStatus(500);
                    } else {
                        console.dir(response.rows);
                        if (response.rows.length > 0) {
                            for (var i = 0; i < response.rows.length; i++) {
                                items.push(response.rows[i].to_json);
                            }
                        }
                        console.dir(items);
                        res.render('partials/item_values', {items: items});
                    }
                });
            }
        }
    );
});
router.get('/total', (req, res) => {
    console.dir('here');
    var month = req.query.month;
    var year = req.query.year;
    var userID = req.user.id;
    db.getClient().query('SELECT value, expense from items_protos where user_id = $1 and month = $2 and year = $3', [userID, month, year], (err, response) => {
        if (!err) {
            res.render('partials/total_monthly', {items: response.rows})
        } else {
            console.dir(err);
        }
    })
});


/*
GET specific item, NOT A PROTOTYPE. Returns HTML.
*/
router.get('/item/:itemID', (req, res) => {
    var itemID = req.params.itemID;
    var userID = req.user.id;

    db.getClient().query('SELECT * from items_protos WHERE items.id = $1 AND ip.user_id = $2', [itemID, userID], (err, response) => {
        if (err) {
            console.dir(err);
            res.sendStatus(500);
        } else {
            res.render('partials/item_value', {item: response.rows[0]});
        }
    });
});

router.get('/item/:itemID/history', (req, res) => {
    var itemID = req.params.itemID;
    db.getClient().query('SELECT * from items_protos WHERE id = $1', [itemID], (err, item_response) => {
        if (err) {
            res.sendStatus(500);
            console.error(err);
        } else {
            db.getClient().query('SELECT * from item_history WHERE item_id = $1 ORDER BY date DESC', [itemID], (err, history_response) => {
                if (err) {
                    res.sendStatus(500);
                    console.error(err);
                } else {
                    res.render('history', {item: item_response.rows[0], history: history_response.rows})
                }
            });
        }
    });
});


/*
POST to a specific item, updating item.
 */
router.post('/item/:itemID', (req, res) => {
    var itemID = req.params.itemID;
    var value = req.body.value;
    console.dir(req.cookies);
    db.getClient().query('UPDATE items SET value = $1 where id = $2', [value, itemID], (err, response) => {
        if (!err) {
            db.getClient().query('SELECT * from items_protos WHERE id = $1', [itemID], (err, response) => {
                if (!err) {
                    res.render('partials/item_value', {item: response.rows[0]})
                }
            });
            db.getClient().query('INSERT INTO item_history(type, value, item_id) VALUES($1, $2, $3)', ["SET", value, itemID], (err, response) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    });
});
/*
DELETE a specific item
 */
router.post('/item/:itemID/delete', (req, res) => {
    var itemID = req.params.itemID;
    var userID = req.user.id;
    db.getClient().query('DELETE from items where id = $1 AND id in (SELECT id from items_protos WHERE id = $1 AND user_id = $2)', [itemID, userID], (err, response) => {
        if (!err) {
            if (!err) {
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
                console.error(err);
            }
        }
    });
})

/*
GET a specific item prototype. Returns the item in HTML.
*/
router.get('/:itemID', (req, res) => {
    var itemID = req.params.itemID;
    db.query('SELECT * from items WHERE id = $1', [itemID], (err, response) => {
        res.json(response[0]);
    });

    var itemName = 'Name';
    var itemValue = '$100.00';
    var itemExpense = false;
    res.render('partials/item_value', {name: itemName, value: itemValue, expense: itemExpense});
});


/*
POST to create an item protoype. Accepts the following parameters in its body.

name: string
expense: boolean
default: boolean

Returns the id of the newly created item.

 */
router.post('/', (req, res) => {
    console.dir(console.dir(req.body));
    var itemName = req.body.name;
    var itemExpense = (req.body.expense == true | req.body.expense == 'on') ? true : false;
    var itemDefault = req.body.default ? req.body.default | req.body.default == 'true' : false;
    var userID = req.user.id;

    var month = req.query.month;
    var year = req.query.year;

    //Create DB accessor to create new object and get the id. For now, return this dummy id.
    var itemData = [itemName, itemExpense, itemDefault, userID];
    console.dir(itemDefault);
    db.getClient().query('INSERT INTO item_protos(name, expense, "default", user_id) VALUES($1, $2, $3, $4) RETURNING *', itemData, (err, proto_response) => {
        if (!err) { /*
        If the request queried a specific month and year, create an item for that month,
        return the formatted item.
        Otherwise, just return the formatted proto.
         */
            if (month && year) {
                var data = [proto_response.rows[0].id, month, year];
                db.getClient().query(`INSERT INTO items(proto, month, year) VALUES($1, $2, $3) RETURNING id`, data, (item_err, item_response) => {
                    if (!item_err) {
                        db.getClient().query(`SELECT * from items_protos WHERE id = ${item_response.rows[0].id}`, [], (err, response) => {
                            res.render('partials/item_value', {item: response.rows[0]});
                        });
                    } else {
                        console.dir(item_err);
                        res.sendStatus(500);
                    }
                });
            } else {
                db.getClient().query(`SELECT * from item_protos WHERE id = ${proto_response.rows[0].id}`, [], (err, response) => {
                    if (!err) {
                        res.render('partials/item_proto', {item: response.rows[0]});
                    } else {
                        console.error(err);
                        res.sendStatus(500);
                    }
                });
            }
        } else {
            res.sendStatus(500);
            console.dir(err);
        }
    });
});

/*
POST to update a specific item prototype.
 */
router.post('/:itemID', (req, res) => {
    var itemName = req.body.name;
    var itemDefault = true;
    var itemID = req.params.itemID;
    var userID = req.user.id;

    db.getClient().query('UPDATE item_protos SET name = $1, "default" = $2 WHERE id = $3 and id in (SELECT id from item_protos WHERE user_id = $4) RETURNING *', [itemName, itemDefault, itemID, userID], (err, response) => {
        if (!err) {
            res.render('partials/item_proto', {item: response.rows[0]});
        } else {
            res.sendStatus(500);
            console.error(err);
        }
    })
});
router.post('/:itemID/delete', (req, res) => {
    var itemID = req.params.itemID;
    var userID = req.user.id;

    db.getClient().query('DELETE from item_protos WHERE id = $1 and id in (SELECT id from item_protos WHERE user_id = $2) RETURNING id', [itemID, userID], (err, response) => {
        if (!err) {
            if (response.rows.length != 0) {
                res.sendStatus(200);
            } else {
                res.sendStatus(309);
            }
        } else {
            res.sendStatus(500);
            console.error(err);
        }
    })
});

module.exports = router;