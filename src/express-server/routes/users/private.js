// user handling router
const express = require("express")
const { checkJWT } = require("../../controllers/middleware")
const router = express.Router()

// route methods implementations
const users = require("../../controllers/users")

// route definitions
router.use(checkJWT)

router.post("/sign-out", users.signOut)

router.put("/follow/:authorId", users.follow)

router.put("/unfollow/:authorId", users.unfollow)

module.exports = router
