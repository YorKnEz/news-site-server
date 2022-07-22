const { Sequelize } = require("sequelize")

// database credentials
const DB_HOST = process.env.DB_HOST
const DB_PORT = process.env.DB_PORT
const DB_NAME = process.env.DB_NAME
const DB_USER = process.env.DB_USER
const DB_PASS = process.env.DB_PASS

// connect using a connection URI
const sequelize = new Sequelize({
	database: DB_NAME,
	username: DB_USER,
	password: DB_PASS,
	host:  DB_HOST,
	port: DB_PORT,
	dialect: "mysql",
	logging: false,
})

// test the connection to the database
const testConnection = async () => {
	try {
		await sequelize.authenticate()
		// await sequelize.sync({ force: true })
		// await sequelize.sync({ alter: true })
		await sequelize.sync()
		console.log("Connection has been established sucessfully.")
	} catch (error) {
		console.error(`Unable to connect to the database: ${error}`)
	}
}

module.exports = { sequelize, testConnection }
