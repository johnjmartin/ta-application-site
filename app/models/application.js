// app/models/application.js
var mongoose = require('mongoose');

var applicationSchema = mongoose.Schema({
    courseCode     : String,
    hasTAed        : Boolean,
    semester       : String,
    submitted      : Boolean,
    isTAing		   : Boolean
});

module.exports = mongoose.model('Application', applicationSchema);
