const { Router } = require("express")
const auth = require("../middleware/userAuth")
const Category = require("../database/models/catagory")

const router = new Router()

router.get("/category", auth, async (req, res) => {
    const category = await Category.find({})
    res.status(200).send(category)
})


module.exports = router