const mongoose = require("mongoose")
const validator = require("validator")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

const workerSchema = mongoose.Schema({
    title:{
        type:String,
        required:true,
        lowercase: true,
    },
    name:{
        type:String,
        required:true,
        lowercase: true,
    },
    age:{
        type:Number,
        validate(value){
            if(value<18){
                throw new Error("Age Error: You are not eligible!");
            }
        },
        required : true,
    },
    aadhar:{
        type:Number,
        unique: true,
        required: true,
        validate(value){
            if(value < 1000000000000000){
                throw new Error("Please enter a valid aadhar number.")
            }
        },
    },
    mobile:{
        type:String,
        required: true,
        unique: true,
        validate(value){
            if(!validator.isMobilePhone(value)){
                throw new Error("Mobile Error: Invalid!")
            }
        },
    },
    email:{
        type: String,
        trim: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Please enter a valid email!")
            }
        }
    },
    password:{
        type: String,
        trim: true,
        required: true,
        validate(value){
            if(value.toLowerCase().includes("password")){
                throw new Error("Common password, try a different combination!")
            }
        }
    },
    experience:{
        type:Number,
        default: 0,
    },
    price:{
        type:Number,
        required:true
    },

    location:{
        type:String,
        required : true,
        lowercase: true
    },
    available:{
        type: Boolean,
        default:true
    },
    status:{
        type:Boolean,
        default:true
    },
    avatar:{
        type: Buffer,
        required:true
    },
    tokens:[{
        token:{
            type: String,
            require: true
        }
    }],
    otp:[{
        otp: String,
        token: String
    }]
},
{
    timestamps:true
})

workerSchema.virtual("likedBy",{
    ref:'Users',
    localField: '_id',
    foreignField: "likedWorkers.worker_id"
})

//Password Hashing
workerSchema.pre("save", async function(req, res, next){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password,9)
    }
    next()
})

//Hiding sensetive data
workerSchema.methods.toJSON = function(){
    const worker = this.toObject()
    delete worker.password
    delete worker.aadhar
    delete worker.otp
    delete worker.tokens
    return worker
}


//Generate AuthToken
workerSchema.methods.generateAuthToken = function(){
    const token = jwt.sign({_id:this._id}, process.env.JWT_SECRETCODE)
    this.tokens = this.tokens.concat({token})
    this.save()
    return token
}

//Generate OTP
workerSchema.methods.generateOtp = async function(){
    try {
        const code = Math.floor((Math.random()*100000)+100000).toString()
        console.log(code)
        const token = jwt.sign({otp:code}, process.env.JWT_SECRETCODE, {expiresIn:120})
        this.otp = {otp:code, token:token}
        await this.save()
    } catch (error) {
        console.log(error)
    }
}

//Logi with OTP    
workerSchema.statics.loginWithOtp = async(mobile, otp)=>{
        const worker = await Worker.findOne({mobile})
        const decode = jwt.verify(worker.otp[0].token, process.env.JWT_SECRETCODE)        
        if(decode && otp == decode.otp){
            return worker
        }
}

//Login with Password
workerSchema.statics.loginWithPassword = async(mobile, email, password)=>{
    const mobOrEmail = mobile ? {mobile} : {email}
    const worker = await Worker.findOne(mobOrEmail)
    if(worker){
        const allow = bcrypt.compare(password, worker.password)
        return allow ? worker: null
    }
}


const Worker = mongoose.model("Workers", workerSchema)

module.exports = Worker