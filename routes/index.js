var express = require("express");
var passport = require("passport");
var mensajes = require("../server/mensajes");

module.exports = function(db){
    var router  = express.Router();
    var middleware = require("../middleware")(db); // if we require a directory we require all files inside


    router.get("/", middleware.isLoggedIn, function(req, res){
        //console.log("En menu: " + JSON.stringify(req.user));
        res.render("menu", {page: 'menu'});
    });

    // show register form
    router.get("/register", middleware.isNotLoggedIn, function(req, res){
        res.render("register", { message: req.flash('signupMessage') }); 
    });

    router.post("/register", passport.authenticate('local-register', {
        successRedirect: '/', // redirect to the secure profile section
        failureRedirect: '/register', // redirect back to the signup page if there is an error
        successFlash: true, // allow flash messages
        failureFlash: true 
    }));

    // show login form
    router.get("/login", middleware.isNotLoggedIn, function(req, res){
        res.render("login"); //{ message: req.flash('loginMessage') }
    });

    // handling login logic - process the login form
    router.post("/login", passport.authenticate('local-login', {
            successRedirect: "/",
            failureRedirect: "/login",
            //successFlash: "Bienvenido " + req.user.nombre + ".",
            failureFlash: "Credenciales incorrectas."
        }), 
        function(req, res){
            // console.log("Login - ");
    });

    // logout route
    router.get("/logout", function(req, res){
       req.logout();
       req.flash("success", mensajes.logout);
       res.redirect("/login");
    });

    return router;
};


