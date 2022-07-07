// news handling router
const express = require("express")
const { checkJWT } = require("../controllers/middleware")
const router = express.Router()

// route methods implementations
const news = require("../controllers/news")

// middlware
router.use(checkJWT)

//route definitions
router.post("/create", news.create)

router.put("/edit", news.edit)

router.delete("/delete", news.delete)

module.exports = router
