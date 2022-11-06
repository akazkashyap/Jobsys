const fs = require("fs")
const path = require("path")

const check = (req, res, next) => {
    try {
        const exists = fs.existsSync(path.join(__dirname, "../../assets/worker-images"))
        if (!exists) {
            fs.mkdirSync(path.join(__dirname, "../../assets/worker-images"), {
                recursive: true
            })
        }
    } catch (error) {
    }
    next()
}

module.exports = check