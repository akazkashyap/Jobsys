require("../database/mongoose")
const Worker = require("../database/models/worker")
const express = require("express")
const multer = require("multer")
const sharp = require("sharp")
const path = require("path")
const fs = require("fs")
const auth = require("../middleware/workerAuth")
const Catagory = require("../database/models/catagory")

const router = new express.Router()

//To save pic on cloud
const Storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "../../assets/worker-images")
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    limits: {
        fileSize: 2000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
            return cb(new Error("Please upload a valid image!"))
        }
        return cb(undefined, true)
    },
    storage: Storage
}).single('avatar')



//Worker Signup
router.post("/signup/worker", upload, async (req, res) => {
    const imgPath = req.file.path
    try {
        if (!req.file) {
            return res.send("Please upload an image!")
        }
        //Checking if worker aleady exists in database
        else {
            const worker = await Worker.find({
                $or: [
                    { mobile: req.body.mobile },
                    { aadhar: req.body.aadhar }
                ]
            })
            //Actioin if exists
            if (worker.length != 0) {
                res.status(400).send({ msg: "Mobile/Aadhar already associated with a worker!" })
            }
            else {
                console.log(req.file.path)
                const buffer = await sharp(req.file.path).resize(110, 110).png().toBuffer()
                const worker = new Worker(req.body)
                worker.avatar = buffer
                worker.imageLink = imgPath
                await worker.save()
                try {
                    const catagory = new Catagory({ title: req.body.title })
                    await catagory.save()
                } catch { }
                res.status(201).send(worker)
            }
        }
    } catch (e) {
        res.status(500).send(e)
    }
})


//Generating Otp
router.post("/worker/login/genOtp", async (req, res) => {
    try {
        const worker = await Worker.findOne({ mobile: req.body.mobile })
        if (!worker) {
            return res.status(404).send({ msg: "Wrong Mobile Number!" })
        }
        await worker.generateOtp()
        res.status(200).send("Check your inbox!")
    } catch (e) {
        res.status(404).send({ error: "Something went wrong! Check Mobile Number!" })
    }
})

//login With Otp
router.post("/worker/login/withOpt", async (req, res) => {
    try {
        const worker = await Worker.loginWithOtp(req.body.mobile, req.body.otp)
        if (!worker) {
            return res.status(406).send({ msg: "Invalid otp" })
        }
        const token = worker.generateAuthToken()
        res.status(200).send({ token })
    } catch (error) {
        if (error.expiredAt) {
            return res.status(400).send({ msg: "OTP Expired!" })
        }
        res.status(500).send({ msg: "Something went wrong!" })
    }
})

//login With password
router.post("/worker/login/withPassword", async (req, res) => {
    try {
        const worker = await Worker.loginWithPassword(req.body.mobile, req.body.email, req.body.password)
        if (!worker) {
            return res.status(400).send({ msg: "Wrong Mobile/Email or Password." })
        }
        const token = worker.generateAuthToken()
        res.status(200).send({ worker, token })
    } catch (error) {
        console.log(error)
        res.send("error")
    }
})


//Logout
router.post("/worker/logout", auth, async (req, res) => {
    try {
        req.worker.tokens = []
        await req.worker.save()
        res.status(200).send({ msg: "Logged out successfully!" })
    } catch (error) {
        res.status(500)
    }
})

//Update Worker Profile
router.patch("/worker/profile/update", auth, async (req, res) => {
    const allowedUpdate = ["name", "age", "location"]
    const providedUpdate = Object.keys(req.body)
    const isAllowed = providedUpdate.every(update => allowedUpdate.includes(update))

    if (!isAllowed) {
        return res.status(406).send({ error: "Invalid Update!" })
    }
    try {
        const worker = req.worker
        providedUpdate.forEach(update => worker[update] = req.body[update])
        await worker.save()
        res.status(202).send(worker)
    } catch (error) {
        res.status(400)
    }
})

//See likes
router.get("/worker/likes", auth, async (req, res) => {
    try {
        const worker = req.worker
        await worker.populate("likedBy", "name id")
        res.status(200).send(worker.likedBy)
    } catch (error) {
        res.status(404).send(error)
    }
})

module.exports = router