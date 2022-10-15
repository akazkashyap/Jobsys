const mongoose = require("mongoose")
// ;
// const MONGODB_URL = "mongodb://127.0.0.1:27017/worker_api"
//mongodb+srv://akazkashyap:dfe787O5ug4fCJIe@workey-app-database.anrcb.mongodb.net/?retryWrites=true&w=majority


mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
}).catch((error) => {
    console.log("Unable to connect to database.")
})   
