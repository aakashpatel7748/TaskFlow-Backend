import 'dotenv/config';
import { app } from './app.js';
import connectDB from "./db/db.js";





connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
        })
    })
    .catch((err: Error) => {
        console.log("MONGO db connection failed !!! ", err);
    })

