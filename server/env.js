'use strict';

const env = {
    PORT: process.env.PORT || 3000,
    HOST: process.env.IP || 'localhost',
    DATABASE_URL: process.env.DATABASE_URL || 'jdbc:mysql://localhost:3306/pfg_rubrica',
    DATABASE_NAME: process.env.DATABASE_NAME || 'pfg_rubrica',
    DATABASE_HOST: process.env.DATABASE_HOST || 'localhost',
    DATABASE_USERNAME: process.env.DATABASE_USERNAME || 'root',
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || 'pfg17',
    DATABASE_PORT: process.env.DATABASE_PORT || 3306,
    DATABASE_DIALECT: process.env.DATABASE_DIALECT || 'mysql',

    PASSPORT_SECRET: process.env.PASSPORT_SECRET || "2j0MCcagy8k7KPIG7hO2UYQ7C6KgXg",

    NODE_ENV: process.env.NODE_ENV || 'development'
};

module.exports = env;