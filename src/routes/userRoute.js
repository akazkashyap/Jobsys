//Libraries
const { Router } = require("express");
const auth = require("../middleware/userAuth");
const multer = require("multer");
const sharp = require("sharp");
//Models
const User = require("../database/models/user");
const Employer = require("../database/models/Employer");

//Router
const router = new Router();

//User SignUp
router.post("/signup/user", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.generateOtp();
    const token = await user.generateAuthToken();
    user.tokens = user.tokens.concat({ token: token });
    await user.sendMail();
    await user.save();
    res.status(201).send({ msg: "Check Your Email and Verify!", token });
  } catch (error) {
    if (error.errors) {
      return res.status(400).send({ msg: "All feilds are required!" });
    } else if (error.keyValue.email) {
      return res.status(400).send({ msg: "User Already exists!" });
    } else {
      return res.status(400).send({ msg: "Bad request, try again" });
    }
    res.status(500).send({ msg: "Something went wrong" });
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
});

//User Verify
router.get("/signup/user/verify", async (req, res) => {
  if (!req.query.token || !req.query.email) {
    return res.status(400).send({ msg: "Wrong link!" });
  }
  try {
    const user = await User.emailVerify(req.query.email, req.query.token);
    res.status(200).send({ msg: "Verfied Successfully :)" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).send({ msg: "Verification link has expired!" });
    }
    res.status(500).send({ msg: "Something went wrong!" });
  }
});

router.post("/user/resend-verification-link", auth, async (req, res) => {
  try {
    await req.user.generateOtp();
    req.user.save();
    req.user.sendMail();
    res.status(200).send({ msg: "Mail sent again" });
  } catch (err) {
    res.status(500);
  }
});

//User Login
router.post("/login/user", async (req, res) => {
  try {
    const user = await User.findByCredentails(
      (email = req.body.email),
      (password = req.body.password)
    );
    const token = await user.generateAuthToken();
    user.tokens = user.tokens.concat({ token: token });
    await user.save();
    if (user.verified) {
      return res.status(200).send({ user, token });
    }
    res.status(200).send({ user, token, verified: user.verified });
  } catch (error) {
    res.status(400).send({ error: "Login : Wrong credentials!" });
  }
});

//User Logout
router.post("/user/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token;
    });
    await req.user.save();
    res.send({ msg: "Logged out" });
  } catch (error) {
    res.status(500);
  }
});

//Logout from all devices
router.post("/user/logout/all-devices", auth, async (req, res) => {
  try {
    req.user.tokens = [];
    await req.user.save();
    res.status(200).send({ msg: "Logged out from all the devices." });
  } catch (error) {
    res.status(500);
  }
});

//User profile
router.get("/user/profile/overview", auth, (req, res) => {
  try {
    res.status(200).send(req.user);
  } catch (error) {
    res.status(500);
  }
});

//Upload Avatar
const upload = multer({
  limits: {
    fileSize: 2000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
      return cb(new Error("Only image is allowed!"));
    }
    return cb(undefined, true);
  },
});

router.post(
  "/user/profile/set-avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const buffer = await sharp(req.file.buffer)
        .resize(200, 200)
        .png()
        .toBuffer();
      req.user.avatar = buffer;
      await req.user.save();
      res.status(200).send({ avatar: req.user.avatar.toString("base64") });
    } catch (error) {
      res.status(400);
    }
  }
);

//UPDATE USER DETAILS
router.patch("/user/profile/update", auth, async (req, res) => {
  const allowedUpdates = ["name", "password", "location", "age", "mobile"];
  const providedUpdates = Object.keys(req.body);
  const allowed = providedUpdates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!allowed) {
    return res.status(406).send({ error: "Invalid update!" });
  }
  try {
    const user = await User.findById(req.user._id);
    providedUpdates.forEach((update) => (user[update] = req.body[update]));
    await user.save();
    res.status(202).send(user);
  } catch (error) {
    res.status(400);
  }
});

//Add or Remove Liked Employers
router.post("/user/liked-job/:id", auth, async (req, res) => {
  try {
    let flag = 0;
    //checking if wotker alreay exist in list
    req.user.likedJobs.forEach((Employer, index) => {
      if (Employer.Employer_id.toString() == req.params.id) {
        req.user.likedJobs.splice(index, 1);
        flag = 1;
      }
    });
    if (flag == 0) {
      req.user.likedJobs = req.user.likedJobs.concat({
        Employer_id: req.params.id,
      });
      await req.user.save();
      res.status(200).send(req.user.likedJobs);
    } else {
      await req.user.save();
      res.status(200).send(req.user.likedJobs);
    }
  } catch (error) {
    res.status(500);
  }
});

//Add rating
router.post("/user/rate", auth, async (req, res) => {
  const Employer_id = req.body.Employer_id;
  const rating = req.body.rating;

  try {
    let ratedEmpty = 0;
    //item = rated arry in user database
    req.user.ratings.forEach(async (item, index) => {
      if (item.Employer_id.toString() == Employer_id) {
        ratedEmpty = 1;
        //to find the difference of the rating
        const previous_rating = req.user.ratings[index].rating;
        const rating_difference = rating - previous_rating;

        req.user.ratings[index].rating = rating;

        await Employer.updateOne(
          { _id: Employer_id },
          {
            $inc: {
              totalRating: rating_difference,
            },
          }
        );

        res.status(200).send({ msg: "Rating updated" });
      }
    });
    if (ratedEmpty == 0) {
      req.user.ratings = req.user.ratings.concat({ Employer_id, rating });

      //it will increase numbers of rated by users in Employers rated by field.
      //Also adds rating total
      await Employer.updateOne(
        { _id: Employer_id },
        {
          $inc: {
            ratedByUsers: 1,
            totalRating: rating,
          },
        }
      );
      res.status(200).send({ msg: "Rating added" });
    }
    await req.user.save();
  } catch (error) {
    res.status(500);
  }
});

router.get("/user/liked-Jobs/get_likes", auth, (req, res) => {
  try {
    res.status(200).send(req.user.likedJobs);
  } catch (error) {
    res.status(500);
  }
});

//Get liked job
router.get("/user/liked-jobs/get", auth, async (req, res) => {
  try {
    await req.user.populate({
      path: "likedJobs.job_id",
      // match,
      // options:{
      //     limit:1
      // }
    });
    res.status(200).send(req.user.likedJobs);
  } catch (error) {
    res.status(500);
  }
});

//Add applyedJobs and increase callCounts
router.post("/user/call/add", auth, async (req, res) => {
  try {
    const user = await User.updateOne(
      { _id: req.user._id },
      {
        $push: {
          applyedJobs: { to: req.body.job_id, time: req.body.time },
        },
        $inc: {
          callCount: 1,
        },
      }
    );
    res.status(200).send({ msg: "Added succesfully!" });
  } catch (error) {
    res.status(400);
  }
});

//Call history
router.get("/user/call/history", auth, async (req, res) => {
  try {
    await req.user.populate("applyedJobs.to", "name mobile title");
    res.status(200).send(req.user.applyedJobs);
  } catch (error) {
    res.status(500);
  }
});

//Delete user
router.delete("/user/profile/delete-account", auth, async (req, res) => {
  try {
    await req.user.remove();
    res.status(200).send({ msg: "Deleted successfully!" });
  } catch (error) {
    res.status(500);
  }
});

//Search
///user/search?q=query&lat=XX&long=XX
router.get("/user/search", auth, async (req, res) => {
  if (!req.query.q) {
    return res.send({ msg: "Please enter keywords to search!" });
  }
  try {
    const Employer = await Employer.find({
      $or: [
        { address: { $regex: req.query.q } },
        { title: { $regex: req.query.q } },
        { name: req.query.q },
      ],
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [req.query.lat, req.query.long],
          },
          $maxDistance: 1000 * 50,
        },
      },
    })
      .limit(10)
      .skip(req.query.page * 10);

    if (!Employer.length) {
      return res.status(204).send({ msg: "No results found." });
    }
    res.send(Employer);
  } catch (error) {
    res.status(500);
  }
});

//Home page
router.get("/user", auth, async (req, res) => {
  const distance = 50; //in kilometers
  try {
    const employer = await Employer.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [req.query.lat, req.query.long],
          },
          $maxDistance: 1000 * distance,
        },
      },
    })
      .limit(10)
      .skip(req.query.page * 10);
    res.status(200).send(employer);
  } catch (error) {
    res.status(500);
  }
});

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

module.exports = router;
