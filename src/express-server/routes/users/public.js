// user handling router
const express = require("express")
const router = express.Router()

// route methods implementations
const users = require("../../controllers/users")

// route definitions
router.put("/register", users.register)

router.post("/login", users.login)

router.get("/verify", users.verify)

router.get("/verify-password-reset", users.verifyPasswordReset)

router.post("/reset-password", users.resetPassword)

module.exports = router
