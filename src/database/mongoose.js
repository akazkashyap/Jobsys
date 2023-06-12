const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
  })
  .catch((error) => {
    console.log("Unable to connect to database.");
  });
