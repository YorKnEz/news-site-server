// user handling router
const express = require("express")

// route methods implementations
const users = require("../../controllers/users")

const router = express.Router()

// route definitions
router.post("/register", users.register)

router.post("/login", users.login)

router.get("/login", users.loginJWT)

router.get("/verify", users.verify)

router.post("/verify-password-reset", users.verifyPasswordReset)

router.patch("/reset-password", users.resetPassword)

module.exports = router
