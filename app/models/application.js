// app/models/application.js
var mongoose = require('mongoose');

var applicationSchema = mongoose.Schema({
    courseCode     : String,
    hasTAed        : Boolean,
    semester       : String
});

module.exports = mongoose.model('Application', applicationSchema);
