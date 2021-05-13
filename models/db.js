const mysql = require("mysql");
const util = require('util');
const config = require("../config/config.js");
const initializer = require('../models/db.initializer.js');

// Создание подключения
const Connection = mysql.createConnection({
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    multipleStatements: true
});

// Открытие подключения к базе данных
Connection.connect(error => {
    if (error) throw error;
    console.log("Successfully connected to the database.");

    initializer.initDatabase(Connection);
});

Connection.query = util.promisify(Connection.query);

module.exports = Connection;
