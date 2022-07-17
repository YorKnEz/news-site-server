const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")
const User = require("./user")

const UserJWT = sequelize.define("UserJWT", {
	jwt: {
		type: DataTypes.STRING,
		allowNull: false,
	},
})

UserJWT.belongsTo(User)

module.exports = UserJWT
