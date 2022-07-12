const { DataSource } = require("apollo-datasource")
const { News, User } = require("../database")
const { formatTitle } = require("../utils")
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
			console.error(`Error in getRedditNewsCount: ${error}`)

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
				order: [["createdAt", "DESC"]],
			})

			return news
		} catch (error) {
			console.error(`Error in getNews: ${error}`)

			return error
		}
	}

	// retrieve one news with the id passed
	async getNewsById(newsId) {
		try {
			const news = await News.findOne({
				where: {
					id: newsId,
				},
			})

			if (!news) throw "News not in our database"

			return news
		} catch (error) {
			console.error(`Error in getNewsById: ${error}`)

			return error
		}
	}

	// retrieve the first [newsToFetch] news after the first [newsToFetch] * offsetIndex news of a certain author
	async getAuthorNews(offsetIndex, id) {
		try {
			const author = await User.findOne({
				where: {
					id,
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
			console.error(`Error in getAuthorNews: ${error}`)

			return error
		}
	}

	// adds news from RedditAPI to the database
	// news is an array
	async addNewsFromReddit(newsData) {
		try {
			const news = newsData.map(async ({ data }) => {
				const newsObject = await News.create({
					title: formatTitle(data.title),
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
			console.error(`Error in addNewsFromReddit: ${error}`)

			return error
		}
	}
}

module.exports = NewsAPI
