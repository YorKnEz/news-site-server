// news handling router
const express = require("express")

const { checkJWT, checkAuthor } = require("../controllers/middleware")

// route methods implementations
const news = require("../controllers/news")

const router = express.Router()

// middlware
router.use(checkJWT)

router.use(checkAuthor)

//route definitions
router.post("/create", news.create)

router.post("/upload-thumbnail", news.uploadThumbnail)

router.put("/edit", news.edit)

router.delete("/delete", news.delete)

module.exports = router
