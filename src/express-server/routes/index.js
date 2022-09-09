const express = require("express")

// middleware
const { errorHandler } = require("../controllers/middleware")

// routes
const { publicUserRouter, privateUserRouter } = require("./users")
const utilsRouter = require("./utils")

const router = express.Router()

router.use("/users", publicUserRouter)

router.use("/users", privateUserRouter)

router.use("/utils", utilsRouter)

router.use(errorHandler)

module.exports = router
