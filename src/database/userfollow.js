const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")
const User = require("./user")

const UserFollow = sequelize.define("UserFollow", {
	createdAt: {
		type: DataTypes.DATE(6),
		allowNull: false,
		defaultValue: DataTypes.NOW,
	},
	authorId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
})

UserFollow.belongsTo(User)

module.exports = UserFollow
