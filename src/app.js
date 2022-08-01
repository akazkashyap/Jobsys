const express = require("express")
const workerRouter = require("./routes/workerRoute")
const userRouter = require("./routes/userRoute")
const path = require("path")
const Worker = require("./database/models/worker")

const PORT = process.env.PORT || 3000
const app = express()
app.use(express.json())

//Routes
app.use(workerRouter)
app.use(userRouter)

app.get("/", async(req, res)=>{
    try {
        const workerData = await Worker.find({})
        .select("_id name title avatar location")
        .limit(20)
        res.send(workerData)
    } catch (error) {
        res.status(500).send({msg:"Something went wrong!"})
    }
})

//Listener
app.listen(PORT, () => {
    console.log("Listening on port : ", PORT)
})


