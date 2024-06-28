const mongoose = require("mongoose");
const express = require("express");
const nocache = require("nocache")

const session = require("express-session");
const path = require('path');
const app = express()
require('dotenv').config()
const secretKey = process.env.SECRET_KEY;

mongoose.connect(process.env.MONGODB_URL)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'))

app.use(nocache())
app.use(session({
    secret: secretKey,
    resave: true,
    saveUninitialized: true
}));



// USER ROUTE
const userroute = require('./routes/userroute');
app.use('/', userroute);

// ADMIN ROUTE

const adminroute = require('./routes/adminroute');
app.use('/admin',adminroute)

// Middleware to handle undefined routes
// app.use((req, res, next) => {
//     const error = new Error("Not Found");
//     error.status = 404;
//     next(error);
//   });
  
//   // Error handling middleware
//   app.use((err, req, res, next) => {
//     let url = "";
//     req.url.split("/")[1] === "admin" ? (url = "/admin/home") : (url = "/");
//     res.status(err.status || 500);
//     res.render("pagenotfound", { error: err, url: url,layout: false });
//   });



app.listen(3000, function () {
    console.log('Listening to the server http://localhost:3000');
});