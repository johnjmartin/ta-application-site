
// app/models/user.js
// load the things we need
var mongoose = require('mongoose');

var courseSchema = mongoose.Schema({
    courseCode     : String,
    hasTAed        : Boolean,
    grade          : String
});

module.exports = mongoose.model('Application', courseSchema);
