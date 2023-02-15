const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const nodemailer = require("nodemailer")


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
        time: String
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
    ratings: [{
        worker_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workers"
        },
        rating: {
            type: Number,
            validate(value) {
                if (value > 5) {
                    throw new Error("rating shouldn't be greater than 5!")
                }
            }
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
        default: null
    },
}, {
    timestamps: true
})

//Hiding private data
userSchema.methods.toJSON = function () {
    const user = this.toObject()
    delete user.password
    delete user.tokens
    delete user.likedWorkers
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
        const token = jwt.sign({ otp: code }, process.env.JWT_SECRETCODE, { expiresIn: 180 })
        this.otp = { otp: code, token: token }
    } catch (error) {
        console.log(error)
    }
}


//send verification mail
userSchema.methods.sendMail = async function () {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "0195cse042@vgi.ac.in",
            pass: "qwertyuiop@0"
        }
    })

    let mailOptions = {
        from: "WORKORA",
        to: this.email,
        subject: "Workora verification",
        //Html code
        html: `<html lang="en">
        <head><style>
                body {font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;color: rgb(59, 59, 59);padding: 20%}
                table {background: linear-gradient(180deg, rgba(138, 131, 254, 0.5) 0%, rgba(0, 177, 171, 0.5) 41%, rgba(123, 233, 255, 0.5) 100%);border-radius: 20px;padding:10%}
                a {background-color: rgb(0, 231, 69);padding: 5px 10px;border-radius: 5px;font-family: Verdana, Geneva, Tahoma, sans-serif;color: rgb(68, 68, 68);text-decoration: none;font-weight: 600;}
              span{font-weight:600;}
        </style></head>
        <body><table><tr><td>
                        <div style="padding: 0 4em; text-align: center;">
                            <h2>We make your work a little easy :)</h2>
                          <p><span>Thanks for signing up in workora.</span>
                                <br><br>
                                Hello ${this.name.toUpperCase()}, your verification link is below, it will expire in
                                3 minutes(180 sec).
                            </p>
                            <p><a href="https://workora.onrender.com/signup/user/verify?email=${this.email}&token=${this.otp[0].token}"
                                    class="btn btn-primary">Verify</a></p>
        </div></td></tr></table></body>
        </html>`
    }

    transporter.sendMail(mailOptions)
        .then(res => {
            console.log("msg sent!")
        })
        .catch(err => console.log(err))
}

//Check Verification link
userSchema.statics.emailVerify = async function (email, token) {
    const valid = jwt.verify(token, process.env.JWT_SECRETCODE)
    if (!valid) {
        throw new Error("token expired")
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
        if (permit) {
            return user
        }
        throw new Error()
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