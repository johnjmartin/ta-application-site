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
			user : req.user // get the user out of session and pass to template
		});
	});

	//INCOMPLETE FUNCTION

	app.post('/profile', isLoggedIn, function(req, res) {
		var body = req.body;

		User.findById(req.user._id, function(err, user) {
			if (err) return handleError(err);
			if (body.hasOwnProperty("fname")) user.fname = body.fname;
			if (body.hasOwnProperty("lname")) user.lname = body.lname;
			if (body.hasOwnProperty("SIN")) user.SIN = body.SIN;
		});

	});


	// =====================================
	// GRADES SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
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
		console.dir(grades_arr);

		grades_arr = grades_arr.map(function (i) {
			var x = i.split(',');
			return { 'grade': x[1], 'course': x[0] };
		});

		console.dir(grades_string);
		console.dir(grades_arr);

	
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
		res.render('application.ejs', {
			user: req.user
		}); // load the application.ejs file
	});

	app.post('/application', isLoggedIn, function(req, res) {
		var body 		          = req.body;
		var newApplication        = new Application();
		newApplication.courseCode = body.courses;
		newApplication.grade	  = body.grades;
		console.dir(body);
		
		if (newApplication.hasOwnProperty('hasTAed')) {
			newApplication.hasTAed = true;
		} else {
			newApplication.hasTAed = false;
		}
		
		User.findById(req.user._id, function(err, user){
			if (err) return handleError(err);
			user.application = newApplication;
			user.save(function(err){
				if (err)
					throw err;
			});
		});
		res.redirect('/success');
	});


	// =====================================
	// ADMINISTRATION =========================
	// =====================================
	app.get('/admin', isLoggedInAdmin, function(req, res) {
		res.render('admin.ejs', {
			user: req.user
		}); // load the application.ejs file
	});

	app.get('/admin/courselist', isLoggedInAdmin, function(req, res) {
		res.render('admin/courselist.ejs', {
			user: req.user
		}); // load the application.ejs file
	});



	// =====================================
	// UPLOAD ==============================
	// =====================================

	app.post('/upload_transcript', isLoggedIn, function(req, res) {
		var transcript;

		if (!req.files) {
			res.send('No files were uploaded.');
			return;
		}

		// The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
		transcript = req.files.transcript;

		var path   = "courselist.csv"

		//TODO: Add a flash to keep user on the page if no files contained in transcript
		if (!req.files.transcript) {
			res.send('No files were uploaded. Hit that back button');
			return;
		}

		// Use the mv() method to place the file somewhere on your server
		transcript.mv(__dirname+'/../public/' + path, function(err) {
			if (err) {
			  res.status(500).send(err);
			}
			else {
			  res.redirect('/admin/courselist')
			}
		});

		fs.readFile('public/courselist.csv', 'utf8', function(err, data) {
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
	}

	// if they aren't redirect them to the home page
	res.redirect('/profile');
}
