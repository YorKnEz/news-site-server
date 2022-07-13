const { sequelize } = require("./sequelize")
const { DataTypes } = require("sequelize")
const User = require("./user")

const UserFollow = sequelize.define("UserFollow", {
	authorId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
})

UserFollow.belongsTo(User)

module.exports = UserFollow
