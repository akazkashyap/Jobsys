const User = require("../database/models/user")
const jwt = require("jsonwebtoken")

const auth = async (req, res, next)=>{
    try {
        const token = req.header("Authorization").replace("Bearer ", "")
        const decode = jwt.verify(token, process.env.JWT_SECRETCODE)
        const user = await User.findOne({_id:decode._id, "tokens.token":token})
        if(!user){
            throw new Error()
        }
        req.token = token
        req.user = user
    } catch (error) {
        res.status(401).send({msg: "Please Authenticate!!"})
    }
    next()
}

module.exports = auth