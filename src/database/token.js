const { sequelize } = require("./sequelize")
const { DataTypes } = require("sequelize")
const User = require("./user")

const Token = sequelize.define("Token", {
	token: {
		type: DataTypes.STRING,
		allowNull: false,
	},
})

Token.belongsTo(User)

module.exports = Token
