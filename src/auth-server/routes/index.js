const express = require("express")
const router = express.Router()

// routes
const userRouter = require("./users")

// middleware
const { errorHandler } = require("../controllers/middleware")

router.use("/users", userRouter)

router.use(errorHandler)

module.exports = router
