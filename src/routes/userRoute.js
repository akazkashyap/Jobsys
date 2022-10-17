//Libraries
const { Router } = require("express")
const auth = require("../middleware/userAuth")
const multer = require("multer")
const sharp = require("sharp")
//Models
const User = require("../database/models/user")
const Worker = require("../database/models/worker")

//Router
const router = new Router()


//User SignUp
router.post("/signup/user", async (req, res) => {
    try {
        const user = new User(req.body)
        await user.generateOtp()
        const token = await user.generateAuthToken()
        user.tokens = user.tokens.concat({ token: token })
        await user.save()
        await user.sendMail()
        res.status(201).send({ msg: "Check Your Email and Verify!", token })
    } catch (error) {
        if (error.errors) {
            return res.status(400).send({ msg: "All feilds are required!" })
        }
        else if (error.keyValue.email) {
            return res.status(400).send({ msg: "User Already exists!" })
        }
        else {
            return res.status(400).send({ msg: "Bad request, try again" })

        }
        res.status(500).send({ msg: "Something went wrong" })
    }

    // async function createUser() {
    //     const user = new User(req.body)
    //     try {
    //         await user.save()
    //         res.status(201).send("Created Successfully!")
    //     } catch (error) {
    //         res.status(500).send(error)
    //     }
    // }

    // if (!req.body.email && !req.body.mobile) {
    //     return res.status(400).send("Email/Mobile is required!!")
    // }
    // else if (req.body.email && req.body.mobile) {
    //     if (await User.findOne({ email: req.body.email }) || await User.findOne({ mobile: req.body.mobile })) {
    //         return res.status(400).send({ Error: "Email or mobile already exits in database pls try another!" })
    //     }
    //     createUser()
    // }
    // else {
    //     if (req.body.mobile) {
    //         return await User.findOne({ mobile: req.body.mobile }) ? res.status(400).send({ error: "Mobile already exists in database!" }) : createUser()
    //     }
    //     else {
    //         return await User.findOne({ email: req.body.email }) ? res.status(400).send({ error: "Email already exists in database!" }) : createUser()
    //     }
    // }
})

//User Verify
router.get("/signup/user/verify", async (req, res) => {
    if (!req.query.token || !req.query.email) {
        return res.status(400).send({ msg: "Wrong link!" })
    }
    try {
        const user = await User.emailVerify(req.query.email, req.query.token)
        res.status(200).send({ msg: "Verfied Successfully :)" })
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.send({ msg: "Verification link has expired!" })
        }
        res.status(500).send({ msg: "Something went wrong!" })
    }
})

router.post("/user/resend-verification-link", auth, async (req, res) => {
    try {
        await req.user.generateOtp()
        req.user.save()
        req.user.sendMail()
        res.send({ msg: "Mail sent again" })
    } catch (err) {
        res.status(500)
    }
})


//User Login
router.post("/login/user", async (req, res) => {
    try {
        const user = await User.findByCredentails(email = req.body.email, password = req.body.password)
        const token = await user.generateAuthToken()
        user.tokens = user.tokens.concat({ token: token })
        await user.save()
        if (user.verified) {
            return res.status(200).send({ user, token })
        }
        res.status(200).send({ user, token, verified: user.verified })
    } catch (error) {
        res.status(400).send({ error: "Login : Wrong credentials!" })
    }
})




//User Logout
router.post("/user/logout", auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        res.send({ msg: "Logged out" })
    } catch (error) {
        res.status(500)
    }
})


//Logout from all devices
router.post("/user/logout/all-devices", auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.status(200).send({ msg: "Logged out from all the devices." })
    } catch (error) {
        res.status(500)
    }
})

//User profile
router.get("/user/profile/overview", auth, (req, res) => {
    try {
        res.status(200).send(req.user)
    } catch (error) {
        res.status(500)
    }
})

//Upload Avatar
const upload = multer({
    limits: {
        fileSize: 2000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
            return cb(new Error("Only image is allowed!"))
        }
        return cb(undefined, true)
    }
})

router.post("/user/profile/set-avatar", auth, upload.single("avatar"), async (req, res) => {
    try {
        const buffer = await sharp(req.file.buffer).resize(200, 200).png().toBuffer()
        req.user.avatar = buffer
        await req.user.save()
        res.status(200).send({ avatar: req.user.avatar })
    } catch (error) {
        res.status(400)
    }
})


//UPDATE USER DETAILS
router.patch("/user/profile/update", auth, async (req, res) => {
    const allowedUpdates = ["name", "password", "location", "age"]
    const providedUpdates = Object.keys(req.body)
    const allowed = providedUpdates.every(update => allowedUpdates.includes(update))

    if (!allowed) {
        return res.status(406).send({ error: "Invalid update!" })
    }
    try {
        const user = await User.findById(req.user._id)
        providedUpdates.forEach(update => user[update] = req.body[update]);
        await user.save()
        res.status(202).send(user)
    }
    catch (error) {
        res.status(400)
    }
})


//Add Liked Workers
router.post("/user/liked-worker/add_:id", auth, async (req, res) => {
    try {
        //checking if wotker alreay exist in list
        req.user.likedWorkers.forEach((worker) => {
            if (worker.worker_id.toString() == req.params.id) {
                return res.status(400).send({ msg: "Already added." })
            }
        })
        req.user.likedWorkers = req.user.likedWorkers.concat({ worker_id: req.params.id })
        await req.user.save()
        res.status(200).send({ msg: "Added successfully." })
    } catch (error) {
        res.status(500)
    }
})


//Get liked workers
router.get("/user/liked-worker", auth, async (req, res) => {
    try {
        await req.user.populate({
            path: 'likedWorkers.worker_id',
            // match,
            // options:{
            //     limit:1
            // }
        })
        res.status(200).send(req.user.likedWorkers)
    } catch (error) {
        res.status(500)
    }
})


//Add calls and increase callCounts
router.post("/user/call/add_:id", auth, async (req, res) => {
    try {
        const user = await User.updateOne({ _id: req.user._id }, {
            $push: {
                calls: { to: req.params.id }
            },
            $inc: {
                callCount: 1
            }
        })
        res.status(200).send({ msg: "Added succesfully!" })
    } catch (error) {
        res.status(400)
    }

})


//Call history
router.get("/user/call/history", auth, async (req, res) => {
    try {
        await req.user.populate("calls.to", "name")
        res.status(200).send(req.user.calls)
    } catch (error) {
        res.status(500)
    }
})


//Delete user
router.delete("/user/profile/delete-account", auth, async (req, res) => {
    try {
        await req.user.remove()
        res.status(200).send({ msg: "Deleted successfully!" })
    } catch (error) {
        res.status(500)
    }
})

//Search
///user/search?q=query
router.get("/user/search", auth, async (req, res) => {
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
        if (!worker.length) {
            return res.status(204).send({ msg: "No results found." })
        }
        res.send(worker)
    } catch (error) {
        res.status(500).send({ msg: "Something went wrong" })
    }
})

//Home page
router.get("/home", auth, async (req, res) => {
    try {
        const worker = await Worker.find({ status: true })
            .limit(10)
            .skip(req.query.page * 10)
        res.status(200).send(worker)
    } catch (error) {
        res.status(500)
    }
})




// router.post("/user/sendmail", auth, async (req, res)=>{
//     try{
//         await req.user.sendEmail()
//         res.send("mail sent")
//     }
//     catch(e){
//         console.log(e)
//         res.status(500)
//     }
// })

module.exports = router
