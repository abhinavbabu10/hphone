const express = require("express");
const session = require("express-session");
const path = require('path');
require('dotenv').config()
const mongoose = require("mongoose");
const userroute = require('./routes/userroute');
const adminroute = require('./routes/adminroute');
mongoose.connect(process.env.MONGODB_URL)
const secretKey = process.env.SECRET_KEY;
const nocache = require("nocache")
const authRoutes = require('./routes/authroute') 
const passport = require('passport')
// const keys = require('./config/keys')



const app = express()

app.use(nocache())


app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use(session({
  secret: secretKey,
  resave: true,
  saveUninitialized: true
}));



app.use(passport.initialize());
app.use(passport.session());


app.use(express.static(path.join(__dirname, 'public')));


app.use(express.static(path.join(__dirname, 'views')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'))


app.use('/auth', authRoutes)
// USER ROUTE

app.use('/', userroute);

// ADMIN ROUTE


app.use('/admin',adminroute)


// AUTH ROUTE



// Middleware to handle undefined routes
app.use((req, res, next) => {
    const error = new Error("Not Found");
    error.status = 404;
    next(error);
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    let url = "";
    req.url.split("/")[1] === "admin" ? (url = "/admin/home") : (url = "/");
    res.status(err.status || 500);
    res.render("pagenotfound", { error: err, url: url,layout: false });
  });



app.listen(3000, function () {
    console.log('Listening to the server http://localhost:3000');
});