// user handling router
const express = require("express")

const { checkJWT } = require("../../controllers/middleware")

// route methods implementations
const users = require("../../controllers/users")

const router = express.Router()

// route definitions
router.use(checkJWT)

router.delete("/sign-out", users.signOut)

router.patch("/follow/:authorId", users.follow)

router.patch("/unfollow/:authorId", users.unfollow)

module.exports = router
