const { DataSource } = require("apollo-datasource")
const { News, User } = require("../database")
const { getFunctionName } = require("../utils")
const format = require("date-fns/format")

const newsToFetch = 2

class NewsAPI extends DataSource {
	constructor() {
		super()
	}

	// get the total number of news in the database
	async getRedditNewsCount() {
		try {
			return News.count({
				where: {
					type: "reddit",
				},
			})
		} catch (error) {
			console.error(`Error in ${getFunctionName()}: ${error}`)

			return error
		}
	}

	// retrieve the first [newsToFetch] news after the first [newsToFetch] * offsetIndex news
	async getNews(offsetIndex, type) {
		try {
			const news = await News.findAll({
				offset: offsetIndex * newsToFetch,
				limit: newsToFetch,
				where: {
					type,
				},
			})

			return news
		} catch (error) {
			console.error(`Error in ${getFunctionName()}: ${error}`)

			return error
		}
	}

	// retrieve one news with the id passed
	async getNewsById(newsId) {
		try {
			const news = await News.findAll({
				where: {
					id: newsId,
				},
			})

			if (!news) throw "News not in our database"

			return news[0].toJSON()
		} catch (error) {
			console.error(`Error in ${getFunctionName()}: ${error}`)

			return error
		}
	}

	// retrieve the first [newsToFetch] news after the first [newsToFetch] * offsetIndex news of a certain author
	async getAuthorNews(offsetIndex, authorEmail) {
		try {
			const author = await User.findOne({
				where: {
					email: authorEmail,
				},
			})

			const news = await News.findAll({
				offset: offsetIndex * newsToFetch,
				limit: newsToFetch,
				where: {
					authorId: author.id,
				},
				order: [["createdAt", "DESC"]],
			})

			return news
		} catch (e) {
			console.error(`Error in ${getFunctionName()}: ${error}`)

			return error
		}
	}

	// adds news from RedditAPI to the database
	// news is an array
	async addNewsFromReddit(newsData) {
		try {
			const news = newsData.map(async ({ data }) => {
				const newsObject = await News.create({
					title: data.title,
					authorId: data.author,
					date: format(data.created * 1000, "MMMM d',' yyyy"),
					thumbnail: "",
					subreddit: data.subreddit_name_prefixed,
					sources: "https://www.reddit.com" + data.permalink,
					body: "",
					type: "reddit",
				})

				return newsObject.toJSON()
			})

			return Promise.all(news)
			// return Promise.all(news)
		} catch (error) {
			console.error(`Error in ${getFunctionName()}: ${error}`)

			return error
		}
	}
}

module.exports = NewsAPI
