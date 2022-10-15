const mongoose = require("mongoose")
// process.env.MONGODB_URL;
// const MONGODB_URL = "mongodb://127.0.0.1:27017/worker_api"

mongoose.connect(MONGODB_URL, {
    useNewUrlParser: true,
}).catch((error) => {
    console.log("Unable to connect to database.")
})   
