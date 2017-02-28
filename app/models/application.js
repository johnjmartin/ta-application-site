// app/models/application.js
var mongoose = require('mongoose');

var applicationSchema = mongoose.Schema({
    courseCode     : [String],
    hasTAed        : Boolean,
    grade          : [String]
});

module.exports = mongoose.model('Application', applicationSchema);
