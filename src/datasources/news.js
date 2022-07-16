const { DataSource } = require("apollo-datasource")
const { News, User } = require("../database")
const { formatTitle, handleError } = require("../utils")
const format = require("date-fns/format")
const { Op } = require("sequelize")
const { ForbiddenError, UserInputError } = require("apollo-server")
const fs = require("fs")

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

	async searchNewsByTitle(search) {
		try {
			let results = {}
			const searchArr = search.split(" ")

			await Promise.all(
				// loop through the search words
				searchArr.map(async s => {
					// find all news that contain a specific word in the title
					const news = await News.findAll({
						where: {
							title: { [Op.substring]: s },
						},
					})

					// map those news in a key-value pair, where key is the id of the news and value is an object containing the news and the number of matches
					news.forEach(data => {
						if (results[data.id]) {
							results[data.id].matches += 1
						} else {
							results[data.id] = {
								news: data.toJSON(),
								matches: 1,
							}
						}
					})
				})
			)

			// get the keys of the results map
			const keys = Object.keys(results)

			// map the results into an array with the matches prop turned into a percentage
			const finalResult = keys.map(key => {
				results[key].matches = Math.floor(
					(results[key].matches / searchArr.length) * 100
				)

				return results[key]
			})

			// sort the results by matches percentage
			results = finalResult.sort(
				(result1, result2) => result2.matches - result1.matches
			)

			return results
		} catch (error) {
			return handleError("searchNewsByTitle", error)
		}
	}

	// for efficiency reasons (lol), the search string must be an exact match of the content of the news, otherwise it won't find anything
	async searchNewsByBody(search) {
		try {
			const news = await News.findAll({
				where: {
					body: { [Op.substring]: search },
				},
			})

			return news.map(n => ({
				news: n.toJSON(),
			}))
		} catch (error) {
			return handleError("searchNewsByBody", error)
		}
	}

	async searchNewsByTags(search) {
		try {
			let results = {}
			const searchArr = search.split(" ")

			await Promise.all(
				// loop through the search words
				searchArr.map(async s => {
					// find all news that contain a specific word in the tags
					const news = await News.findAll({
						where: {
							tags: { [Op.substring]: s },
						},
					})

					// map those news in a key-value pair, where key is the id of the news and value is an object containing the news and the number of matches
					news.forEach(data => {
						if (results[data.id]) {
							results[data.id].matches += 1
						} else {
							results[data.id] = {
								news: data.toJSON(),
								matches: 1,
							}
						}
					})
				})
			)

			// get the keys of the results map
			const keys = Object.keys(results)

			// map the results into an array with the matches prop turned into a percentage
			const finalResult = keys.map(key => {
				results[key].matches = Math.floor(
					(results[key].matches / searchArr.length) * 100
				)

				return results[key]
			})

			// sort the results by matches percentage
			results = finalResult.sort(
				(result1, result2) => result2.matches - result1.matches
			)

			return results
		} catch (error) {
			return handleError("searchNewsByTags", error)
		}
	}

	async createNews(newsData, userId) {
		try {
			// get the user that made the request
			const user = await User.findOne({
				where: {
					id: userId,
				},
			})

			// create the news
			const news = await News.create({
				title: newsData.title,
				authorId: user.id,
				thumbnail: newsData.thumbnail,
				sources: newsData.sources,
				tags: newsData.tags,
				body: newsData.body,
				type: "created",
			})

			// increment the users writtenNews
			await user.update({
				writtenNews: user.writtenNews + 1,
			})

			// save the changes to the user
			await user.save()

			// return the id of the news
			return news.id
		} catch (error) {
			return handleError("createNews", error)
		}
	}

	async updateNews(newsData, newsId, userId) {
		try {
			// get the user that made the request
			const user = await User.findOne({
				where: { id: userId },
			})

			// get the news that he wants to edit
			const news = await News.findOne({
				where: { id: newsId },
			})

			// if there is no news found, the id was invalid
			if (!news) throw new UserInputError("Invalid id.")

			// check if the author of the news is the same as the user who requested the edit
			if (news.authorId != userId)
				throw new ForbiddenError("You are not the author of this news.")

			// update the news
			await news.update({
				title: newsData.title,
				authorId: user.id,
				thumbnail: newsData.thumbnail,
				sources: newsData.sources,
				tags: newsData.tags,
				body: newsData.body,
				type: "created",
			})

			// save changes
			await news.save()

			// return the updated news
			return news
		} catch (error) {
			return handleError("updateNews", error)
		}
	}

	async deleteNews(newsId, userId) {
		try {
			// get the user that made the request
			const user = await User.findOne({
				where: {
					id: userId,
				},
			})

			// get the news that he wants to edit
			const news = await News.findOne({
				where: { id: newsId },
			})

			// if there is no news found, the id was invalid
			if (!news) throw new UserInputError("Invalid id.")

			// check if the author of the news is the same as the user who requested the edit
			if (news.authorId != userId)
				throw new ForbiddenError("You are not the author of this news.")

			// get the name of the thumbnail as it is saved on the server
			const ip = process.env.EXPRESS_SERVER_IP

			const thumbnail = news.thumbnail.replace(`${ip}/public/`, "")

			// delete the thumbnail from the server
			fs.unlink(`./public/${thumbnail}`, err => {
				if (err) console.log(err)
			})

			// delete the news
			await news.destroy()

			// update the number of written news of the user
			await user.update({
				writtenNews: user.writtenNews - 1,
			})

			// save the changes
			await user.save()
		} catch (error) {
			return handleError("deleteNews", error)
		}
	}
}

module.exports = NewsAPI
