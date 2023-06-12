require("../database/mongoose");
const employer = require("../database/models/employer");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/employerAuth");
const Catagory = require("../database/models/catagory");
const checkDir = require("../middleware/checkAssets");
const router = new express.Router();

//To save pic on cloud
const Storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../assets/employer-images"));
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  limits: {
    fileSize: 2000000,
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
      return cb(new Error("Please upload a valid image!"));
    }
    return cb(undefined, true);
  },
  storage: Storage,
}).single("avatar");

//employer Signup
router.post("/signup/employer", checkDir, upload, async (req, res) => {
  //const imgPath = "/assets/employer-images/" + req.file.filename
  try {
    if (!req.file) {
      return res.send("Please upload an image!");
    }
    //Checking if employer aleady exists in database
    else {
      const employer = await Employer.find({
        $or: [
          { mobile: req.body.mobile },
          {
            "idProof.name": req.body.idProof.name,
            "idProof.number": req.body.idProof.number,
          },
        ],
      });
      //Actioin if exists
      if (employer.length != 0) {
        res
          .status(400)
          .send({ msg: "Mobile/ID Proof already associated with a employer!" });
      } else {
        const buffer = await sharp(req.file.path)
          .resize(200, 200)
          .webp()
          .toBuffer();
        const employer = new employer(req.body);
        employer.avatar = buffer;
        //employer.imageLink = imgPath
        await Employer.save();
        try {
          const catagory = new Catagory({ title: req.body.title });
          await catagory.save();
        } catch {}
        res.status(201).send(employer);
      }
    }
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

//Generating Otp
router.post("/employer/login/genOtp", async (req, res) => {
  try {
    const employer = await Employer.findOne({ mobile: req.body.mobile });
    if (!employer) {
      return res.status(404).send({ msg: "Wrong Mobile Number!" });
    }
    await Employer.generateOtp();
    res.status(200).send("Check your inbox!");
  } catch (e) {
    res
      .status(404)
      .send({ error: "Something went wrong! Check Mobile Number!" });
  }
});

//login With Otp
router.post("/employer/login/withOpt", async (req, res) => {
  try {
    const employer = await Employer.loginWithOtp(req.body.mobile, req.body.otp);
    if (!employer) {
      return res.status(406).send({ msg: "Invalid otp" });
    }
    const token = employer.generateAuthToken();
    res.status(200).send({ token });
  } catch (error) {
    if (error.expiredAt) {
      return res.status(400).send({ msg: "OTP Expired!" });
    }
    res.status(500).send({ msg: "Something went wrong!" });
  }
});

//login With password
router.post("/employer/login/withPassword", async (req, res) => {
  try {
    const employer = await Employer.loginWithPassword(
      req.body.mobile,
      req.body.email,
      req.body.password
    );
    if (!employer) {
      return res.status(400).send({ msg: "Wrong Mobile/Email or Password." });
    }
    const token = employer.generateAuthToken();
    res.status(200).send({ employer, token });
  } catch (error) {
    console.log(error);
    res.send("error");
  }
});

//Logout
router.post("/employer/logout", auth, async (req, res) => {
  try {
    req.employer.tokens = [];
    await req.employer.save();
    res.status(200).send({ msg: "Logged out successfully!" });
  } catch (error) {
    res.status(500);
  }
});

//Update employer Profile
router.patch("/employer/profile/update", auth, async (req, res) => {
  const allowedUpdate = ["name", "age", "location"];
  const providedUpdate = Object.keys(req.body);
  const isAllowed = providedUpdate.every((update) =>
    allowedUpdate.includes(update)
  );

  if (!isAllowed) {
    return res.status(406).send({ error: "Invalid Update!" });
  }
  try {
    const employer = req.employer;
    providedUpdate.forEach((update) => (employer[update] = req.body[update]));
    await Employer.save();
    res.status(202).send(employer);
  } catch (error) {
    res.status(400);
  }
});

//See likes
router.get("/employer/likes", auth, async (req, res) => {
  try {
    const employer = req.employer;
    await Employer.populate("likedBy", "name id");
    res.status(200).send(employer.likedBy);
  } catch (error) {
    res.status(404).send(error);
  }
});

module.exports = router;
