const express = require("express")
const workerRouter = require("./routes/workerRoute")
const userRouter = require("./routes/userRoute")
const Worker = require("./database/models/worker")
const catagoryRouter = require("./routes/categoryRoute")
const cors = require("cors")

const PORT = process.env.PORT || 3000
const app = express()
app.use(express.json())
app.use('/static', express.static('assets'))


//Routes
app.use(workerRouter)
app.use(userRouter)
app.use(catagoryRouter)

//CORS Configuration
const corsOpts = {
    origin: '*',
    methods: [
        'GET',
        'POST',
    ],
    allowedHeaders: [
        'Content-Type',
    ],
};

app.use(cors(corsOpts));


//------------------------Guest Routes---------------------------

//HOME PAGE
app.get("/", async (req, res) => {
    try {
        const workerData = await Worker.find({})
            .select("_id name title avatar location")
            .limit(10)
            .skip(10 * req.query.page)
        if (!workerData.length) {
            return res.status(404).send({ msg: "Nothing to show!" })
        }
        res.status(200).send(workerData)
    } catch (error) {
        res.status(500).send({ msg: "Something went wrong!" })
    }
})

//Guest search api
app.get("/search", async (req, res) => {
    if (!req.query.q) {
        return res.send({ msg: "Please enter keywords to search!" })
    }
    try {
        const worker = await Worker.find({
            $or: [
                { location: { $regex: req.query.q } },
                { title: { $regex: req.query.q } },
                { name: req.query.q }
            ]
        })
            .select("_id name title avatar location")
            .limit(10)
            .skip(10 * req.query.page)
        if (!worker.length) {
            return res.status(404).send({ msg: "No results found." })
        }
        res.status(200).send(worker)
    } catch (error) {
        console.log(error)
        res.status(500).send({ msg: "Something went wrong" })
    }
})

//Listener
app.listen(PORT, () => {
    console.log("Listening on port : ", PORT)
})


