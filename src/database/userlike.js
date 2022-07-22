const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")
const User = require("./user")

const UserLike = sequelize.define("UserLike", {
	// the id of the news being liked
	newsId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	// the type means "like" or "dislike" to avoid creating two tables
	type: {
		type: DataTypes.STRING,
		allowNull: false,
	},
})

UserLike.belongsTo(User)

module.exports = UserLike
