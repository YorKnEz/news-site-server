// user handling router
const express = require("express")

const { checkJWT } = require("../../controllers/middleware")

// route methods implementations
const users = require("../../controllers/users")

const router = express.Router()

// middlware
router.use(checkJWT)

// route definitions
router.delete("/sign-out", users.signOut)

router.patch("/follow/:authorId", users.follow)

router.patch("/unfollow/:authorId", users.unfollow)

module.exports = router
