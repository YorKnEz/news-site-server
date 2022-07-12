const express = require("express")
const router = express.Router()

// routes
const { publicUserRouter, privateUserRouter } = require("./users")
const newsRouter = require("./news")

// middleware
const { errorHandler } = require("../controllers/middleware")

router.use("/users", publicUserRouter)

router.use("/users", privateUserRouter)

router.use("/news", newsRouter)

router.use(errorHandler)

module.exports = router
