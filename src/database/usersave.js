const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")
const User = require("./user")

const UserSave = sequelize.define("UserSave", {
	// the id of the news or comment being saved
	parentId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	// the type of the parent being saved, can be either "news" or "comment"
	parentType: {
		type: DataTypes.STRING,
		allowNull: false,
	},
})

UserSave.belongsTo(User)

module.exports = UserSave
