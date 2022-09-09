// news handling router
const express = require("express")

const { checkJWT, checkAuthor } = require("../controllers/middleware")

// route methods implementations
const utils = require("../controllers/utils")

const router = express.Router()

//route definitions
router.post("/upload-profile-picture", utils.uploadPhoto)

// middlware
router.use(checkJWT)

router.use(checkAuthor)

//route definitions
router.post("/upload-thumbnail", utils.uploadPhoto)

module.exports = router
