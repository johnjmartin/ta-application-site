// app/routes.js
var Application = require('./models/application');
var User       	= require('./models/user');
var Grades      = require('./models/grades');
var Course      = require('./models/course');

var fileUpload  = require('express-fileupload');
var fs 			= require('fs');


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
			user : req.user // get the user out of session and pass to template
		});
	});

	app.post('/grades', isLoggedIn, function(req, res) {
		// initalize course details
		var body 	      = req.body;
		var grades_string = body.grades;
		var grades_arr    = [];
		var newGrades 	  = new Grades();

		try {
			grades_arr = body.grades.replace(/\r/g,'');
			grades_arr = grades_arr.split('\n');
		} catch (err) {
			throw err;
		}

		grades_arr = grades_arr.map(function (i) {
			var x = i.split(',');
			return { 'grade': x[1], 'course': x[0] };
		});
	
		newGrades.grades = grades_arr;

		User.findById(req.user._id, function(err, user){
			if (err) return handleError(err);
			user.grades = newGrades;
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
		Course.find({}, function(err, courses) {
			//check for error
			res.render('application.ejs', {
				courses: courses,
				user: req.user,
				successMessage: req.flash('success')
			}); // load the application.ejs file
		}); 
	});

	app.post('/application', isLoggedIn, function(req, res) {
		var body 		          = req.body;
		var appList = [];
		var courseList = [body.F0, body.F1, body.F2, body.F3, body.F4, body.F5, body.W0, body.W1, body.W2, body.W3, body.W4, body.W5];
		var TAList = [body. checkF0, body.checkF1, body.checkF2, body.checkF3, body.checkF4, body.checkF5, body.checkW0, body.checkW1, body.checkW2, body.checkW3, body.checkW4, body.checkW5];
		console.log(courseList[0]);
		for (i = 0; i < 12; i++){
			if (courseList[i] != "Select a course"){
				var newApplication = new Application();
				newApplication.courseCode = courseList[i];
				newApplication.hasTAed = TAList[i];
				if (i < 6){
					newApplication.semester = "Fall";
				} else{
					newApplication.semester = "Winter";
				}
				appList.push(newApplication);
			}
		}
		/*
		newApplication.courseCode = body.courses;
		newApplication.grade	  = body.grades;
		console.dir(body);
		
		if (newApplication.hasOwnProperty('hasTAed')) {
			newApplication.hasTAed = true;
		} else {
			newApplication.hasTAed = false;
		}
		*/
		User.findById(req.user._id, function(err, user){
			if (err) return handleError(err);
			user.applications = appList;
			user.save(function(err){
				if (err)
					throw err;
			});
		});
		req.flash('success', 'Succesfully applied to courses');
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
			   console.log('collection removed') 
			});
			if (err) throw err;
			data = data.replace(/\r/g,'');
			data = data.split('\n');

			data = data.filter( function(i){
				return i != '';
			}).map( function(i) {
				return i.split(',');
			});

			for (i = 1; i<data.length; i++) {
				var newCourse 				= new Course();
				newCourse.term 				= data[i][0];
				newCourse.courseID  		= data[i][1];
				newCourse.courseDescription = data[i][2];
				newCourse.instructorName    = data[i][3];
				newCourse.save(function(err){
					if (err) throw err;
				});			
			}
			req.flash('uploadMessage', 'Upload Success!!')
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

// will 
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
