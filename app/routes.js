// app/routes.js
var Application = require("./models/application");
var User       	= require('./models/user');
var fileUpload  = require('express-fileupload');


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
	// show the login form
	app.get('/login', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	// process the login form
	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/login', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
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

	app.post('/profile', isLoggedIn, function(req, res) {
		var body 		          = req.body;
		var newApplication        = new Application();
		newApplication.courseCode = body.course;
		newApplication.grade	  = body.grade;
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

	// =====================================
	// UPLOAD ==============================
	// =====================================

	app.post('/upload', isLoggedIn, function(req, res) {
		var transcript;

		if (!req.files) {
			res.send('No files were uploaded.');
			return;
		}

		// The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
		transcript = req.files.transcript;

		var path   = req.user._id + "_transcript.pdf"

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
		  res.send('File uploaded!');
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
