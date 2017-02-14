
// app/models/user.js
// load the things we need
var mongoose = require('mongoose');

var courseSchema = mongoose.Schema({
	grades: [{ grade: String, course: String }]
});

module.exports = mongoose.model('Grades', courseSchema);
