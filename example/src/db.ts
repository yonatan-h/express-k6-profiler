import mongoose from 'mongoose';
const MONGO_PORT = 3012;
const DB_NAME = 'kray_example';
//put creds inside .env, not code in prod btw
mongoose.connect(`mongodb://root:example@localhost:${MONGO_PORT}/${DB_NAME}?authSource=admin`);
