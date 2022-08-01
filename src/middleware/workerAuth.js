const Worker = require("../database/models/worker")
const jwt = require("jsonwebtoken")

const auth = async(req, res, next)=>{
    try {
        const token = req.header("Authorization").replace("Bearer ", "")
        const decode = jwt.verify(token, process.env.JWT_SECRETCODE)
        const worker = await Worker.findOne({_id:decode._id, "tokens.token":token})
        if(!worker){
            throw new Error()
        }
        req.token = token
        req.worker = worker
    } catch (error) {
        res.status(401).send({msg: "Please Authenticate"})
    }
    next()
}

module.exports = auth