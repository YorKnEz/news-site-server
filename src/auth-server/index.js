// initializing the server
const express = require("express")

// check connection to database
const { testConnection } = require("../database/sequelize")
testConnection()

async function startAuthServer() {
	const server = express()
	server.use(express.json())

	// API endpoints
	const routers = require("./routes")

	server.use((req, res, next) => {
		// Allow localhost:3000 to access the API
		res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000")

		// Allow the following methods in requests
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")

		// Headers to allow
		res.setHeader(
			"Access-Control-Allow-Headers",
			"X-Requested-With,content-type"
		)

		next()
	})

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
