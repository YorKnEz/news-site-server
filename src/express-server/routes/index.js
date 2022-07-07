const express = require("express")
const router = express.Router()

// routes
const userRouter = require("./users")
const newsRouter = require("./news")

// middleware
const { errorHandler } = require("../controllers/middleware")

router.use("/users", userRouter)

router.use("/news", newsRouter)

router.use(errorHandler)

module.exports = router
