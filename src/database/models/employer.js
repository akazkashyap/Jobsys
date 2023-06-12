const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const employerSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      lowercase: true,
    },
    age: {
      type: Number,
      validate(value) {
        if (value < 18) {
          throw new Error("Age Error: You are not eligible!");
        }
      },
      required: true,
    },
    idProof: {
      name: String,
      number: {
        type: String,
        required: true,
      },
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      validate(value) {
        if (!validator.isMobilePhone(value)) {
          throw new Error("Mobile Error: Invalid!");
        }
      },
    },
    email: {
      type: String,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Please enter a valid email!");
        }
      },
    },
    password: {
      type: String,
      trim: true,
      required: true,
      validate(value) {
        if (value.toLowerCase().includes("password")) {
          throw new Error("Common password, try a different combination!");
        }
      },
    },
    description: {
      type: String,
      default: 0,
    },

    totalRating: {
      type: Number,
      default: 0,
    },
    ratedByUsers: {
      type: Number,
      default: 0,
    },

    salary: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
      lowercase: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    available: {
      type: Boolean,
      default: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: Buffer,
      required: true,
    },

    // imageLink: {
    //     type: String,
    //     required: true
    // },
    tokens: [
      {
        token: {
          type: String,
          require: true,
        },
      },
    ],
    otp: [
      {
        otp: String,
        token: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

employerSchema.virtual("likedBy", {
  ref: "Users",
  localField: "_id",
  foreignField: "likedJobs.job_id",
});

//Password Hashing
employerSchema.pre("save", async function (req, res, next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 9);
  }
  next();
});

//Hiding sensetive data
employerSchema.methods.toJSON = function () {
  const employer = this.toObject();
  delete employer.password;
  delete employer.idProof;
  delete employer.otp;
  delete employer.tokens;
  delete employer.location;
  return employer;
};

//Generate AuthToken
employerSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRETCODE);
  this.tokens = this.tokens.concat({ token });
  this.save();
  return token;
};

//Generate OTP
employerSchema.methods.generateOtp = async function () {
  try {
    const code = Math.floor(Math.random() * 100000 + 100000).toString();
    console.log(code);
    const token = jwt.sign({ otp: code }, process.env.JWT_SECRETCODE, {
      expiresIn: 120,
    });
    this.otp = { otp: code, token: token };
    await this.save();
  } catch (error) {
    console.log(error);
  }
};

//Logi with OTP
employerSchema.statics.loginWithOtp = async (mobile, otp) => {
  const employer = await Employer.findOne({ mobile });
  const decode = jwt.verify(employer.otp[0].token, process.env.JWT_SECRETCODE);
  if (decode && otp == decode.otp) {
    return employer;
  }
};

//Login with Password
employerSchema.statics.loginWithPassword = async (mobile, email, password) => {
  const mobOrEmail = mobile ? { mobile } : { email };
  const employer = await Employer.findOne(mobOrEmail);
  if (employer) {
    const allow = bcrypt.compare(password, employer.password);
    return allow ? employer : null;
  }
};

employerSchema.index({ location: "2dsphere" });
const Employer = mongoose.model("Employer", employerSchema);

module.exports = Employer;
