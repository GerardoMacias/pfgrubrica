'use strict'

const mysql = require('mysql');
const env = require('./env');
const pool = mysql.createPool({
    connectionLimit : 100, 
    host     : env.DATABASE_HOST,
    port     : env.DATABASE_PORT,
    user     : env.DATABASE_USERNAME,
    password : env.DATABASE_PASSWORD,
    database : env.DATABASE_NAME,
    debug    : false,
    multipleStatements : true
});

const db = {};

db.pool = pool;
db.mysql = mysql;

module.exports = db;