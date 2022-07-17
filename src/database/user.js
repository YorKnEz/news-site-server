const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")

const User = sequelize.define("User", {
	// first name of the user
	firstName: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	// last name of the user
	lastName: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	// the full name of the user
	fullName: {
		type: DataTypes.STRING(512),
		allowNull: false,
	},
	// the email of the user, unique
	email: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: true,
	},
	// whether the email has been verified by the user or not
	verified: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
		defaultValue: false,
	},
	// the password of the user (encrypted)
	password: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	// the image to be displayed as the profile picture of the user
	profilePicture: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: "default",
	},
	// the type of the user: "author" or "user"
	type: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	// the number of news written by this author
	writtenNews: {
		type: DataTypes.INTEGER,
		allowNull: true,
	},
	// the number of followers of this author
	followers: {
		type: DataTypes.INTEGER,
		allowNull: true,
	},
})

module.exports = User
