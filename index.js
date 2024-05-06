const mongoose = require("mongoose");
const express = require("express");

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




// Provide a secret option for express-session
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

app.listen(3000, function () {
    console.log('Listening to the server http://localhost:3000');
});