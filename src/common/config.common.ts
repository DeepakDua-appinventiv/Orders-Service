import * as dotenv from "dotenv";
dotenv.config({});

const config = {
    EMAIL: process.env.EMAIL,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    DB_NAME: process.env.DB_NAME,
}

export default config;