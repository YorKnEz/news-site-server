const { DataSource } = require("apollo-datasource")
const { News, User } = require("../database")
const { formatTitle, handleError } = require("../utils")
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
			return handleError("getRedditNewsCount", error)
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
			return handleError("getNews", error)
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
			return handleError("getNewsById", error)
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
		} catch (error) {
			return handleError("getAuthorNews", error)
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
			return handleError("addNewsFromReddit", error)
		}
	}
}

module.exports = NewsAPI
