const { Sequelize } = require("sequelize")

// database credentials
const DB_USER = process.env.DB_USER
const DB_PASS = process.env.DB_PASS

// connect using a connection URI
const sequelize = new Sequelize({
	database: "news_site_db",
	username: DB_USER,
	password: DB_PASS,
	host: "localhost",
	port: 3306,
	dialect: "mysql",
	logging: false,
})

// test the connection to the database
const testConnection = async () => {
	try {
		await sequelize.authenticate()
		await sequelize.sync({ force: true })
		console.log("Connection has been established sucessfully.")
	} catch (error) {
		console.error(`Unable to connect to the database: ${error}`)
	}
}

module.exports = { sequelize, testConnection }
