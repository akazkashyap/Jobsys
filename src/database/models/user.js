const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const nodemailer = require("nodemailer")
const prodUrl = "/signup/user/verify"


const userSchema = mongoose.Schema({
    name: {
        type: String,
        trim: true,
        lowercase: true,
        required: true
    },

    age: {
        type: Number,
    },

    email: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
        unique: true
    },

    password: {
        type: String,
        trim: true,
        required: true,
        minLength: [8, "Password too short!"],
        validate(value) {
            if (value.toLowerCase().includes("password")) {
                throw new Error("Password can't contain 'Password'!")
            }
        }
    },

    mobile: {
        type: String,
        validate(value) {
            if (!validator.isMobilePhone(value)) {
                throw new Error("Mobile Number Error: invalid!")
            }
        },
    },
    verified: {
        type: Boolean,
        default: false
    },

    otp: [{
        otp: String,
        token: String
    }],

    location: {
        type: String,
        default: null,
        lowercase: true,
    },

    calls: [{
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workers",
        },
        time: {
            type: Date,
            default: Date.now
        }
    }],

    callCount: {
        type: Number,
        default: 0
    },

    likedWorkers: [{
        worker_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workers",
        }
    }],
    tokens: [{
        token: {
            type: String,
            required: true,
        },
        time: {
            type: Date,
            default: Date.now
        }
    }],
    avatar: {
        type: Buffer,
        default: undefined
    }
}, {
    timestamps: true
})

//Hiding private data
userSchema.methods.toJSON = function () {
    const user = this.toObject()
    delete user.password
    delete user.tokens
    return user
}

//Generate authentication token
userSchema.methods.generateAuthToken = function () {
    const user = this
    return jwt.sign({ _id: user._id }, process.env.JWT_SECRETCODE)
}


//Generate OTP
userSchema.methods.generateOtp = async function () {
    try {
        const code = Math.floor((Math.random() * 100000) + 100000).toString()
        const token = jwt.sign({ otp: code }, process.env.JWT_SECRETCODE, { expiresIn: "2d" })
        this.otp = { otp: code, token: token }
    } catch (error) {
        console.log(error)
    }
}


//send verification mail
userSchema.methods.sendMail = function () {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "0195cse042@vgi.ac.in",
            pass: "qwertyuiop@0"
        }
    })

    let mailOptions = {
        from: "Workey",
        to: this.email,
        subject: "Workey",
        html: `<h1>Hello ${this.name.toUpperCase()}</h1> <br> <p>Your verification link is: <a href="${prodUrl}?email=${this.email}&token=${this.otp[0].token}">verification link.</a> <br><p>This link will expire in 2 days (48 hours).</p>`
    }

    transporter.sendMail(mailOptions)
        .then(res => console.log("msg sent!"))
        .catch(err => console.log(err))
}

//Check Verification link
userSchema.statics.emailVerify = async function (email, token) {
    const valid = jwt.verify(token, process.env.JWT_SECRETCODE)
    if (!valid) {
        throw new Error("Error: Link has expired!")
    }
    try {
        const user = await User.findOne({
            email,
            'otp.token': token
        })
        user.verified = true
        await user.save()
        return user
    }
    catch (error) {
        throw new Error("Error: Wrong link!")
    }
}

//Login Function
userSchema.statics.findByCredentails = async (email, password) => {
    const user = await User.findOne({ email })
    if (user) {
        const permit = await bcrypt.compare(password, user.password)
        if (permit && user.verified) {
            return user
        }
        else {
            throw new Error("verification")
        }
    }
    throw new Error("Error: Wrong credentials!")
}

//Hash password before saving 
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 9)
    }
    next()
})


const User = mongoose.model("Users", userSchema)

module.exports = User