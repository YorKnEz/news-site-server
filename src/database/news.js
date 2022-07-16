const { sequelize } = require("./sequelize")
const { DataTypes } = require("sequelize")

const News = sequelize.define("News", {
	// the title of the news
	title: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	// the id of the author that created the news
	authorId: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	// the image to be used as a thumbnail for the news
	thumbnail: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	// the subreddit the news originates from (if the news has been taken from reddit)
	subreddit: {
		type: DataTypes.STRING,
		allowNull: true,
		defaultValue: "",
	},
	// the sources of the news
	sources: {
		type: DataTypes.STRING(512),
		allowNull: false,
	},
	// the tags of the news, that help for better searching
	tags: {
		type: DataTypes.STRING(512),
		allowNull: true,
	},
	// the body of the news, the information
	body: {
		type: DataTypes.TEXT,
		allowNull: false,
	},
	// the type of the news
	// can be: "reddit", "created" (as in created from news-site)
	type: {
		type: DataTypes.STRING,
		allowNull: false,
	},
})

module.exports = News
