const express = require("express");
const employerRouter = require("./routes/employerRoute");
const userRouter = require("./routes/userRoute");
const Employer = require("./database/models/employer");
const catagoryRouter = require("./routes/categoryRoute");
const cors = require("cors");

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use("/static", express.static("assets"));

//Routes
app.use(employerRouter);
app.use(userRouter);
app.use(catagoryRouter);

//CORS Configuration
const corsOpts = {
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOpts));

//------------------------Guest Routes---------------------------

//HOME PAGE
app.get("/", async (req, res) => {
  const distance = 100; //in kilometers
  try {
    const employer = await Employer.find({
      // location: {
      //     $near: {
      //         $geometry: {
      //             type: "Point",
      //             coordinates: [req.query.lat, req.query.long]
      //         },
      //         $maxDistance: 1000 * distance
      //     }
      // }
    })
      .select("_id name title avatar address")
      .limit(10)
      .skip(req.query.page * 10);

    if (!employerData.length) {
      return res
        .status(204)
        .send({ msg: "Sorry no Jobs found in your area :(" });
    }
    res.status(200).send(employer);
  } catch (error) {
    res.status(500);
  }
});

//Guest search api
app.get("/search", async (req, res) => {
  if (!req.query.q) {
    return res.send({ msg: "Please enter keywords to search!" });
  }
  try {
    const employer = await Employer.find({
      $or: [
        { address: { $regex: req.query.q } },
        { title: { $regex: req.query.q } },
        { name: req.query.q },
      ],
    })
      .select("_id name title avatar address")
      .limit(10)
      .skip(10 * req.query.page);
    if (!employer.length) {
      return res.status(404).send({ msg: "No results found." });
    }
    res.status(200).send(employer);
  } catch (error) {
    console.log(error);
    res.status(500).send({ msg: "Something went wrong" });
  }
});

//Listener
app.listen(PORT, () => {
  console.log("Listening on port : ", PORT);
});
