const express = require("express")

// middleware
const { errorHandler } = require("../controllers/middleware")

// routes
const { publicUserRouter, privateUserRouter } = require("./users")
const newsRouter = require("./news")

const router = express.Router()

router.use("/users", publicUserRouter)

router.use("/users", privateUserRouter)

router.use("/news", newsRouter)

router.use(errorHandler)

module.exports = router
