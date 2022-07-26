const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")
const User = require("./user")

const UserVote = sequelize.define("UserVote", {
	// the id of the news or comment being voted
	parentId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	// the type means "like" or "dislike" to avoid creating two tables
	type: {
		type: DataTypes.STRING,
		allowNull: false,
	},
})

UserVote.belongsTo(User)

module.exports = UserVote
