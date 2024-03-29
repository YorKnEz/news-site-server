// initializing the server
const express = require("express")
const cors = require("cors")
const fileupload = require("express-fileupload")

// required for creating a /public folder on startup
const fs = require("fs")

async function startExpressServer() {
	const server = express()
	server.use(express.json())
	server.use(fileupload())
	server.use(express.urlencoded({ extended: true }))

	// API endpoints
	const routers = require("./routes")

	server.use(cors())

	server.use("/", routers)

	try {
		if (!fs.existsSync("./public")) fs.mkdirSync("./public")
	} catch (error) {
		console.error(error)
	}

	server.use("/public", express.static("public"))

	// port to listen to
	const authServerPort = process.env.EXPRESS_SERVER_PORT

	server.listen(authServerPort, () => {
		console.log(`
    🚀  Auth Server is running
    🔉  Listening on port ${authServerPort}
    `)
	})
}

module.exports = {
	startExpressServer: startExpressServer,
}
