const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const userSchema = mongoose.Schema({
    name:{
        type:String,
        required: true,
        trim: true,
        lowercase:true
    },
    
    age:{
        type:Number,
    },

    email:{
        type:String,
        trim : true,
        lowercase: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Email Error : invalid!")
            }
        },
    },

    password:{
        type:String,
        trim : true,
        required: true,
        minLength : [8, "Password too short!"],
        validate(value){
            if(value.toLowerCase().includes("password")){
                throw new Error("Password can't contain 'Password'!")
            }
        }
    },

    mobile:{
        type:String,
        validate(value){
            if(!validator.isMobilePhone(value)){
                throw new Error("Mobile Number Error: invalid!")
            }
        },
    },

    location:{
        type:String,
        required:true,
        lowercase: true,
    },

    calls:[{
        to:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "Workers",
        },
        time:{
            type: Date,
            default:Date.now
        }
    }],

    callCount:{
        type:Number,
        default : 0
    },

    likedWorkers:[{
        worker_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref : "Workers",
        }
    }],
    tokens:[{
        token:{
            type:String,
            required : true,
        },
        time:{
            type: Date,
            default: Date.now
        }
    }],
    avatar:{
        type: Buffer,
        default : undefined
    }
},{
    timestamps:true
})

//Hiding private data
userSchema.methods.toJSON = function(){
    const user = this.toObject()
    delete user.password
    delete user.tokens
    return user
}

//Generate authentication token
userSchema.methods.generateAuthToken = function(){
    const user = this
    return jwt.sign({_id: user._id}, process.env.JWT_SECRETCODE)
}

//Login Function
userSchema.statics.findByCredentails = async (mobile, email, password)=>{
    const mobOrEmail = mobile ? {mobile} :  {email} 
    const user = await User.findOne(mobOrEmail)
    if(user){
        const permit = await bcrypt.compare(password,user.password)
        if(permit){
            return user
        }
    }
    throw new Error("Error: Wrong credentials!")
}

//Hash password before saving 
userSchema.pre("save", async function(next){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password, 9)
    }
    next()
})


const User = mongoose.model("Users", userSchema)

module.exports = User