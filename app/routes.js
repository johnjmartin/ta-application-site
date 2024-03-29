// app/routes.js
var Application = require('./models/application');
var User       	= require('./models/user');
var Course      = require('./models/course');

var fileUpload  = require('express-fileupload');
var fs 			= require('fs');
var parse 		= require('csv-parse');
require('should');



module.exports = function(app, passport) {

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	app.get('/', function(req, res) {
		res.render('index.ejs'); // load the index.ejs file
	});

	// =====================================
	// LOGIN ===============================
	// =====================================
	app.get('/login', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/grades', // redirect to the secure profile section
		failureRedirect : '/login', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// SIGNUP ==============================
	// =====================================
	app.get('/signup', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', isLoggedIn, function(req, res) {
		res.render('profile.ejs', {
			user : req.user,
			message: req.flash('success')
		});
	});

	//INCOMPLETE FUNCTION

	app.post('/profile', isLoggedIn, function(req, res) {
		var body = req.body;

		User.findById(req.user._id, function(err, user) {
			if (err) return handleError(err);
			if (body.hasOwnProperty("fname")) user.fname = body.fname;
			if (body.hasOwnProperty("lname")) user.lname = body.lname;
			if (body.hasOwnProperty("year")) user.year = body.year;
			user.save(function(err){
				if (err) {
					throw err;
				}
				else {
					req.flash('success', "Profile updated successfully!");
				}
			});
		});

		res.redirect('/profile');
	});


	// =====================================
	// GRADES SECTION =========================
	// =====================================
	app.get('/grades', isLoggedIn, function(req, res) {
		res.render('grades.ejs', {
			user : req.user,
			message: req.flash('message')
		});
	});

	app.post('/grades', isLoggedIn, function(req, res) {
		// initalize course details
		var body 	      = req.body;
		var grades_string = body.grades;
		var grades_arr    = [];

		if (req.user.applications != undefined)
			var appList = req.user.applications;
		else
			var appList = [];
		
		try {
			grades_arr = body.grades.replace(/\r/g,'');
			grades_arr = grades_arr.split('\n');
		} catch (err) {
			req.flash('message', 'Error parsing grades, check formatting and try again');
			throw err;
		}

		for (var i=0; i<grades_arr.length; i++) {
			var exists = false;
			var newGrades 	  = new Application();
			var temp = grades_arr[i].split(',');
			if (!temp[1] || !temp[0] ) {
				req.flash('message', 'One or more grades formatted incorrectly, try again.');
				res.redirect('/grades');
				return;
			}
			temp[1] = temp[1].trim();
			temp[0] = temp[0].trim()

			for (var j=0; j<appList.length; j++) {
				var course = appList[j].courseCode;
				if (temp[0] == course) {
					exists = true;
					newApplication = appList[j];
				}
			}
			newGrades.grade = temp[1];
			newGrades.courseCode = temp[0];
			if (!exists) {
				newGrades.hasTAed = false;
				newGrades.isTAing  = false;
				appList.push(newGrades);
			}
		}

		User.findById(req.user._id, function(err, user){
			if (err) return handleError(err);
			user.applications = appList;
			user.save(function(err){
				if (err)
					throw err;
				});
		});

		res.redirect('/application');
	});

	// =====================================
	// APPLICATION =========================
	// =====================================
	app.get('/application', isLoggedIn, function(req, res) {
		var semesterSet = new Set();
		var semesterArray = [];		
		Course.find({}, function(err, courses) {
			for (var i=0; i<courses.length; i++) {
				semesterSet.add(courses[i].term);
			}
			semesterArray = Array.from(semesterSet);
			//check for error
			res.render('application.ejs', {
				semesters: semesterArray,
				courses: courses,
				user: req.user,
				successMessage: req.flash('successMessage')
			}); // load the application.ejs file
		}); 
	});

	app.post('/application', isLoggedIn, function(req, res) {
		var body = req.body;
		if (req.user.applications != undefined){
			var appList = req.user.applications;
		}
		else {
			var appList = [];
		}
		console.dir(appList);
		console.dir(req.user);

		
		var semesterSet = new Set();
		var semesterArray = [];
		Course.find({}, function(err, courses) {
			for (var i=0; i<courses.length; i++) {
				semesterSet.add(courses[i].term);
			}
			semesterArray = Array.from(semesterSet);
			var courseList = [body.F0, body.F1, body.F2, body.F3, body.F4, body.F5, 
							  body.W0, body.W1, body.W2, body.W3, body.W4, body.W5, 
							  body.S0, body.S1, body.S2, body.S3, body.S4, body.S5];
			var TAList = [body.checkF0, body.checkF1, body.checkF2, body.checkF3, body.checkF4, body.checkF5, 
						  body.checkW0, body.checkW1, body.checkW2, body.checkW3, body.checkW4, body.checkW5,
						  body.checkS0, body.checkS1, body.checkS2, body.checkS3, body.checkS4, body.checkS5];
			for (var i=0; i<TAList.length; i++) {
				if (TAList[i]=='on') TAList[i] = true;
				else TAList[i] = false
			}

			for (i = 0; i < 18; i++) {
				if (courseList[i] != "Course Code") {
					//check if application created already
					var currentSemester = "";

					if (i < 6) {
						currentSemester = semesterArray[0];
					} else if (i < 12 && i >= 6) {
						currentSemester = semesterArray[1];
					}
					else {
						currentSemester = semesterArray[2];
					}
					var exists = false;
					var newApplication = new Application();

					for (var j=0; j<appList.length; j++) {
						var course = appList[j].courseCode;
						if (courseList[i] == course) {
							exists = true;
							newApplication = appList[j];
						}
					}

					newApplication.courseCode = courseList[i];
					newApplication.hasTAed = TAList[i];
					newApplication.semester = currentSemester;
					newApplication.isTAing = false;	

					if (body.hasOwnProperty('submitButton')) {
						newApplication.submitted = true;
					}
					console.dir("\n");

					if (!exists) appList.push(newApplication);
					else console.dir(appList)
				}
			}
		});
		if (body.hasOwnProperty('submitButton')) {
			req.flash('successMessage', 'Succesfully applied to courses');
		} else {
			req.flash('successMessage', 'Changes saved');
		}

		User.findById(req.user._id, function(err, user){
			if (err) return handleError(err);
			user.applications = appList;
			user.save(function(err){
				if (err)
					throw err;
			});
		});
		
		res.redirect('/application');
	});


	// =====================================
	// ADMINISTRATION =========================
	// =====================================
	app.get('/admin', isLoggedInAdmin, function(req, res) {
		User.find({}, function(err, users) {
			res.render('admin.ejs', {
			users: users,
			user: req.user
			});
		});
	});

	// To give/remove admin priviliges 
	app.post('/admin', isLoggedInAdmin, function(req, res) {
		console.dir(req.body);
		if(req.body.emailgive != ''){
			User.findOne({ 'email': req.body.emailgive }, function(err, user){
				if (err) return handleError(err);
				user.admin = true;
				user.save(function(err){
					if (err)
						throw err;
				});
			});
			res.redirect('/admin');
		}
		if(req.body.emailremove != ''){
			User.findOne({ 'email': req.body.emailremove }, function(err, user){
				if (err) return handleError(err);
				user.admin = false;
				user.save(function(err){
					if (err)
						throw err;
				});
			});
			res.redirect('/admin');
		}

	});

	app.get('/admin/applications', isLoggedInAdmin, function(req, res) {
		User.find({}, function(err, users) {
			Course.find({}, function(err, courses) {
				res.render('admin/applications.ejs', {
					users: users,
					courses: courses,
					user: req.user
				});
			});
		});
	});



	app.post('/admin/applications/:userId/:appId/:checked', isLoggedInAdmin, function(req, res) {
		var userId = req.params.userId;
		var appId = req.params.appId;
		var checked = req.params.checked;
		if (checked == 'true')
			checked = true;
		else
			checked = false;

		User.findById(userId, function(err, user){
			if (err) return handleError(err);
			var app = user.applications.id(appId);
			console.dir(app);

			if (checked) {
				user.numAssigned += 1;
				app.isTAing = true;
			}
			else {
				user.numAssigned -= 1;
				app.isTAing = false;
			}

			user.save(function(err){
				if (err)
					throw err;
			});
		});


		res.send("success");
	});


	app.get('/admin/applications/json', isLoggedInAdmin, function(req, res) {
		User.find({}, function(err, users) {
			Course.find({}, function(err, courses) {
				var applicants = findApplicants(users, courses); 
				res.send(applicants);
			});
		});
	});

	app.get('/admin/courselist', isLoggedInAdmin, function(req, res) {
		Course.find({}, function(err, courses) {
			res.render('admin/courselist.ejs', {
				courses: courses,
				user: req.user,
				errorMessage: req.flash('error'),
				successMessage: req.flash('success')
			}); // load the application.ejs file
		});
	});


	// =====================================
	// UPLOAD ==============================
	// =====================================

	//NOTE/TODO: courselists cannot have extra commas within course descriptions, etc. 
	app.post('/upload_courselist', isLoggedInAdmin, function(req, res) {
		var transcript;
		// The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
		transcript = req.files.transcript;
		var path   = "courselist.csv"

		//Flash to keep user on the page if no files contained in transcript
		if (!req.files.transcript) {
			req.flash('error', "Error, files missing!");
			res.redirect(301, '/admin/courselist');
			return;
		}

		// Use the mv() method to place the file somewhere on your server
		transcript.mv(__dirname+'/../public/' + path, function(err) {
			if (err) {
				res.status(500).send(err);
			}
			else {
				req.flash('success', 'Course List file uploaded successfully! Verify contents in the table below.')
				res.redirect('/admin/courselist');
			}
		});

		fs.readFile('public/courselist.csv', 'utf8', function(err, data) {
			Course.remove({}, function(err) { 
			   console.log('collection removed');
			});
			if (err) req.flash('error', 'Error Parsing uploaded file');
			parse(data, {columns: true}, function(err, output) {
				if (err) req.flash('error', 'Error Parsing uploaded file');
				var x = output;
				for (var i=0; i<x.length; i++) {
					if (x[i]['Term']) {
						var newCourse 				= new Course();
						newCourse.term 				= x[i]['Term'];
						newCourse.courseID  		= x[i]['Course ID'];
						newCourse.courseDescription = x[i]['Course Description'];
						newCourse.instructorName    = x[i]['Instructor Name'];
						newCourse.save(function(err){
							if (err) throw err;
						});
					}	
				}
			});
		});
	});


	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
};

// route middleware to make sure
function isLoggedIn(req, res, next) {

	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();

	// if they aren't redirect them to the home page
	res.redirect('/');
}

function isLoggedInAdmin(req, res, next) {
	// if user is authenticated in the session, carry on
	if (req.isAuthenticated()) {
		if (req.user.admin){
			return next();
		}
		res.redirect('/profile')
	}
	// if they aren't redirect them to the home page
	res.redirect('/');
}

function findApplicants(users, courses) {
	// users = [ {name:John, applications:[{courseCode: ''', semester:''' }] }]
	// courses = [ {term     		  : String, courseID          : String, courseDescription : String, instructorName    : String}]
	var applicants_table = [];
	for (var i=0; i<courses.length; i++) {
		var course = courses[i];
		//Calling function to generate ranking (add ranking to each user application, then return the user)
		users = generateRanking(users, course);
		for (var j=0; j<users.length; j++) {
			var user         = users[j];
			var applications = user.applications;
			if (applications) {
				for (var k=0; k<applications.length; k++) {
					var app = applications[k];
					// if (app.courseCode == course.courseID && course.term == app.semester){
					if (app.courseCode == course.courseID && course.term == app.semester) {
						var id = user._id + ',' + app._id;
						var checkbox = '<input id="makeTA" value="false" type="checkbox" name="' + id + '">'
						if (app.isTAing) checkbox = '<input id="makeTA" value="true" type="checkbox" name="' + id + '" checked>'
						var grade = app.grade;
						if (grade == undefined) grade = " "
						var applicant = { 
							'term'    	  : course.term, 
							'courseID'	  : course.courseID,
							'fullName'    : user.fname + ' ' + user.lname,
							'email'	      : user.email,
							'year'		  : user.year,
							'grade'		  : grade,
							'score'		  : app.score,
							'numAssigned' : '<span class="'+ user._id + '">' + user.numAssigned + '</span>',
							'hasTAed'	  : app.hasTAed,
							'isTAing'	  : checkbox
						};
						applicants_table.push(applicant);
					}
				}
			}
		}
	}
	return applicants_table;
}

function generateRanking(users, course) {

	for (var j=0; j<users.length; j++) {
		var user = users[j];
		var applications = user.applications;
		if (applications) {
			for (var k=0; k<applications.length; k++) {
				var app = applications[k];
				if (app.courseCode == course.courseID && course.term == app.semester) {
					var grade_score = 0;
					var year_score = 0;
					var TA_score = 0;

					if (app.hasTAed)
						TA_score = 1;
					if (app.grade)
						grade_score = ConvertGrade(app.grade);
					year_score = ConvertYear(user.year, app.courseCode);

					if (app.year == "Graduate") {
						var score = +(((TA_score * 0.40) + (year_score * 0.3) + (grade_score * 0.3)).toFixed(2))
					} else {
						var score = +(((TA_score * 0.35) + (year_score * 0.5) + (grade_score * 0.15)).toFixed(2))
					}
					app.score = score;
				}
			}
		}
	}
	return users;
}

//convert grade to score between 0 & 1
function ConvertGrade(z) {
    var x = z.toString().toUpperCase();
    var scale = 4.3;
    switch (x) {
    	case "A+":
    		return +((4.3 / scale).toFixed(2));
        case "A":
            return +((4.0 / scale).toFixed(2));
        case "A-":
            return +((3.7 / scale).toFixed(2));
        case "B+":
            return +((3.3 / scale).toFixed(2));
        case "B":
            return +((3.0 / scale).toFixed(2));
        case "B-":
            return +((2.7 / scale).toFixed(2));
        case "C+":
            return +((2.3 / scale).toFixed(2));
        case "C":
            return +((2.0 / scale).toFixed(2));
        case "C-":
            return +((1.7 / scale).toFixed(2));
        case "D+":
            return +((1.3 / scale).toFixed(2));
        case "D":
            return +((1.0 / scale).toFixed(2));
        case "D-":
        	return +((0.7 / scale).toFixed(2));
        case "F":
            return +((0.0 / scale).toFixed(2));
        default:
        	return 0;
    }
}

function ConvertYear(year, course) {
	var courseNum = findFirstNum(course);
	console.dir(courseNum);
	var scale = 5;
	switch (year) {
		case "First Year":
			var score = calcYearCourseScore(courseNum, 1);
			return score;
        case "Second Year":
			var score = calcYearCourseScore(courseNum, 2);
			return score;
        case "Third Year":
			var score = calcYearCourseScore(courseNum, 3);
			return score;
        case "Fourth Year":
			var score = calcYearCourseScore(courseNum, 4);
			return score;
        case "Graduate":
			var score = calcYearCourseScore(courseNum, 5);
			return score;
	}
}

function findFirstNum(code) {
	for (var i=0; code.length; i++) {
		var num = parseInt(code[i]);
		if (!isNaN(num)) {
			return num;
		}
	}
	return 0;
}

function calcYearCourseScore(course, year) {
	if (course == 1) {
		if (year == 5)
			return 0;
		else if (year == 4)
			return 0.25;
		else if (year == 3)
			return 0.75;
		else if (year == 2)
			return 1;
		else if (year == 1)
			return 0.5;
		else return 0;
	}
	if (course == 2) {
		if (year == 5)
			return 0.1;
		else if (year == 4)
			return 0.25;
		else if (year == 3)
			return 1;
		else if (year == 2)
			return 0.5;
		else return 0;
	}
	if (course == 3) {
		if (year == 5)
			return 0.75;
		else if (year == 4)
			return 1;
		else if (year == 3)
			return 0.5;
		else if (year == 2)
			return 0.1;
		else return 0;
	}
	if (course == 4) {
		if (year == 5)
			return 1;
		else if (year == 4)
			return 0.5;
		else if (year == 3)
			return 0.1;
		else return 0;
	}
	//if it isnt a course in range 100-499
	return 0;
}
