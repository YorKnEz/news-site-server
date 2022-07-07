// user handling router
const express = require("express")
const { appendFile } = require("fs")
const { checkJWT } = require("../controllers/middleware")
const router = express.Router()

// route methods implementations
const users = require("../controllers/users")

// route definitions
router.put("/register", users.register)

router.post("/login", users.login)

router.get("/verify", users.verify)

router.get("/verify-password-reset", users.verifyPasswordReset)

router.post("/reset-password", users.resetPassword)

router.use("/sign-out", checkJWT)

router.post("/sign-out", users.signOut)

module.exports = router
