const mongoose = require('mongoose');

module.exports = function models (app) {
    mongoose.Promise = Promise;
    mongoose.connect('mongodb://localhost:27017/excel-sdmx', { useNewUrlParser: true })
        .then(() => console.log('success'))
            .catch(err => console.log(err));
    
    require('./Dataset');
};