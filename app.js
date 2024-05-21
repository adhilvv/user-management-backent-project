const dotenv = require('dotenv');
const path = require('path');
const express = require('express');
const connectDB = require('./server/config/db');
const customerRoutes = require('./server/routes/customer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 5000;

dotenv.config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));


// Express session
app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
    })
);



// Connect to database
connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`App listening on port ${port}`);
        });
    })
    .catch((err) => {
        console.error('Error connecting to database:', err);
    });

// Routes
app.use('/', customerRoutes);

// Handle 404 errors
app.use('*', (req, res) => {
    res.status(404);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal Server Error');
});

module.exports = app;
