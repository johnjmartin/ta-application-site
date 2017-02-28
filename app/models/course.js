// app/models/courselist.js
var mongoose = require('mongoose');

var courseSchema = mongoose.Schema({
    term     		  : String,
    courseID          : String,
    courseDescription : String,
    instructorName    : String
});

module.exports = mongoose.model('Course', courseSchema);
