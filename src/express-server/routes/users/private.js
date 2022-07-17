// user handling router
const express = require("express")

const { checkJWT } = require("../../controllers/middleware")

// route methods implementations
const users = require("../../controllers/users")

const router = express.Router()

// route definitions
router.use(checkJWT)

router.post("/sign-out", users.signOut)

router.put("/follow/:authorId", users.follow)

router.put("/unfollow/:authorId", users.unfollow)

module.exports = router
