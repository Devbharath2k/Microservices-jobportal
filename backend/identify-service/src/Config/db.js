import mongoose from'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import logger from '../Utils/logger.js';

const Mongodb = process.env.MONGO_URI;

if(!Mongodb){
    logger.warn(`No MongoDB URI found. Make sure to set MONGO_URI environment variable.`);
    throw new Error('No MongoDB URI found. Make sure to set MONGO_URI environment variable.');
}

const HandlerDatabaseConnection = async () => {
    try {
        await mongoose.connect(Mongodb);
        logger.info('Connected to MongoDB :)');
    } catch (error) {
        logger.error(`Failed to connect to MongoDB: ${error.message}`);
        process.exit(1);
    }
}

export default HandlerDatabaseConnection;

