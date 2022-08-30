const { DataTypes } = require("sequelize")

const { sequelize } = require("./sequelize")

const News = sequelize.define(
	"News",
	{
		createdAt: {
			type: DataTypes.DATE(6),
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
		// the title of the news
		title: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		// the id of the author that created the news
		authorId: {
			type: DataTypes.INTEGER,
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
		// the id of the reddit news if its a reddit news
		redditId: {
			type: DataTypes.STRING,
			allowNull: true,
			unique: true,
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
			defaultValue: "",
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
		// number of replies
		replies: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		// the link of the news, formatted properly
		link: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		// required for searching by title, body and tags
		all_search: {
			type: DataTypes.TSVECTOR,
		},
	},
	{
		indexes: [
			{
				name: "all_index",
				fields: ["all_search"],
				using: "gin",
			},
			{
				name: "title_index",
				fields: [
					sequelize.fn("to_tsvector", "english", sequelize.col("title")),
				],
				using: "gin",
			},
			{
				name: "body_index",
				fields: [sequelize.fn("to_tsvector", "english", sequelize.col("body"))],
				using: "gin",
			},
			{
				name: "tags_index",
				fields: [sequelize.fn("to_tsvector", "english", sequelize.col("tags"))],
				using: "gin",
			},
		],
	}
)

module.exports = News
