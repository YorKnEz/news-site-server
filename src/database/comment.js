const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")
const User = require("./user")

const Comment = sequelize.define("Comment", {
	createdAt: {
		type: DataTypes.DATE(6),
		allowNull: false,
		defaultValue: DataTypes.NOW,
	},
	// the news this comment belongs to
	newsId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
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
		type: DataTypes.TEXT,
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
	// the score of the post is likes - dislikes
	score: {
		type: DataTypes.INTEGER,
		allowNull: false,
		defaultValue: 0,
	},
	// replies counter
	replies: {
		type: DataTypes.INTEGER,
		allowNull: false,
		defaultValue: 0,
	},
})

Comment.belongsTo(User)

module.exports = Comment
