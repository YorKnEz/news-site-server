// initializing the server
const express = require("express")
const cors = require("cors")

// check connection to database
const { testConnection } = require("../database/sequelize")
testConnection()

async function startAuthServer() {
	const server = express()
	server.use(express.json())

	// API endpoints
	const routers = require("./routes")

	server.use(cors())

	server.use("/", routers)

	// port to listen to
	const authServerPort = process.env.AUTH_SERVER_PORT

	server.listen(authServerPort, () => {
		console.log(`
    🚀  Auth Server is running
    🔉  Listening on port ${authServerPort}
    `)
	})
}

module.exports = {
	startAuthServer: startAuthServer,
}
