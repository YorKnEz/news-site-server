const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")
const User = require("./user")

const Comment = sequelize.define("Comment", {
	// id of the parent of the comment (either a news or another comment if it's a reply)
	parentId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	// the type of the parrent ("news" or "comment")
	parentType: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	// the body of the comment, the comment itself
	body: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	likes: {
		type: DataTypes.INTEGER,
		allowNull: false,
		defaultValue: 0,
	},
	dislikes: {
		type: DataTypes.INTEGER,
		allowNull: false,
		defaultValue: 0,
	},
})

Comment.belongsTo(User)

module.exports = Comment
