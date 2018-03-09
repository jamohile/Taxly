module.exports.HAS_VALID_USER = (req, res, next) => {
    if(req.user){
        next();
    }else{
        res.sendStatus(309);
    }
}