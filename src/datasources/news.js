const { DataSource } = require("apollo-datasource")
const { ForbiddenError, UserInputError } = require("apollo-server")
const format = require("date-fns/format")
const fs = require("fs")
const { Op } = require("sequelize")

const { News, User, UserLike } = require("../database")
const { formatTitle, handleError } = require("../utils")

// required for getting the thumbnail name of a news to delete it
const ip = process.env.EXPRESS_SERVER_IP

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
	async getNews(offsetIndex, type, dataToFetch) {
		try {
			const news = await News.findAll({
				offset: offsetIndex * dataToFetch,
				limit: dataToFetch,
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
	async getAuthorNews(offsetIndex, id, dataToFetch) {
		try {
			const author = await User.findOne({
				where: {
					id,
				},
			})

			const news = await News.findAll({
				offset: offsetIndex * dataToFetch,
				limit: dataToFetch,
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
			// map through the news
			const news = newsData.map(async ({ data }) => {
				// try to find if the current news has already been added
				const news = await News.findOne({
					where: { redditId: data.id },
				})

				// if the news exists, return it
				if (news) return news.toJSON()

				// if it doesn't exist, create it
				const newsObject = await News.create({
					redditId: data.id,
					title: formatTitle(data.title),
					authorId: data.author,
					createdAt: data.created,
					thumbnail: "",
					subreddit: data.subreddit_name_prefixed,
					sources: "https://www.reddit.com" + data.permalink,
					body: "",
					type: "reddit",
				})

				// and return it
				return newsObject.toJSON()
			})

			return Promise.all(news)
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
			const searchArr = search.split(", ")

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

			// delete the old thumbnail from the server if there is a new one
			if (newsData.thumbnail) {
				const thumbnail = news.thumbnail.replace(`${ip}/public/`, "")

				// delete the thumbnail from the server
				fs.unlink(`./public/${thumbnail}`, err => {
					if (err) console.log(err)
				})
			}

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

	// method for liking or disliking news based on the action type and the ids of the news and the user
	// action - 'like' or 'dislike'
	async voteNews(action, newsId, userId) {
		try {
			/*
				propName - if the user wants to like the news, we update propName of news
				propName2 - if the user wants to like the news, but he already disliked it, we update propName and propName2 of news
				message1 - message to display if the user removed the like successfully
				message2 - message to display if the user liked the news successfully
			*/
			const options = {
				like: {
					propName: "likes",
					propName2: "dislikes",
					message1: "News like removed",
					message2: "News liked",
				},
				dislike: {
					propName: "dislikes",
					propName2: "likes",
					message1: "News dislike removed",
					message2: "News disliked",
				},
			}

			// first check if the news exists
			const news = await News.findOne({ where: { id: newsId } })

			// if the news doesn't exist, throw an error
			if (!news) throw new UserInputError("Invalid id.")

			// try to find if the user already liked the news
			const link1 = await UserLike.findOne({
				where: {
					newsId,
					UserId: userId,
					type: action,
				},
			})

			// if he already liked the news, remove the like
			if (link1) {
				// remove the link
				await link1.destroy()

				// update likes counter
				await news.update({
					[options[action].propName]: news[options[action].propName] - 1,
				})

				// save changes
				await news.save()

				// return message
				return {
					message: options[action].message1,
					likes: news.likes,
					dislikes: news.dislikes,
				}
			}

			// try to find if the user disliked the news
			const link2 = await UserLike.findOne({
				where: {
					newsId,
					UserId: userId,
					type: action === "like" ? "dislike" : "like",
				},
			})

			// if he already disliked the news, remove the dislike in order to add the like
			if (link2) {
				// remove the link
				link2.destroy()

				// update dislikes counter
				await news.update({
					[options[action].propName2]: news[options[action].propName2] - 1,
				})

				// save changes
				await news.save()
			}

			// create the link between the user and the news
			await UserLike.create({
				UserId: userId,
				newsId: newsId,
				type: action,
			})

			// update likes counter
			await news.update({
				[options[action].propName]: news[options[action].propName] + 1,
			})

			// save changes
			await news.save()

			return {
				message: options[action].message2,
				likes: news.likes,
				dislikes: news.dislikes,
			}
		} catch (error) {
			return handleError("voteNews", error)
		}
	}

	async getVoteState(newsId, userId) {
		try {
			// find if the user liked or disliked the news
			const link = await UserLike.findOne({
				where: {
					UserId: userId,
					newsId,
					type: { [Op.or]: ["like", "dislike"] },
				},
			})

			if (!link) return "none"

			return link.type
		} catch (error) {
			return handleError("voteState", error)
		}
	}

	// retrieve the first [newsToFetch] news after the first [newsToFetch] * offsetIndex news that a certain user liked
	async getLikedNews(offsetIndex, userId, dataToFetch) {
		try {
			// retrieve all the ids of the liked news
			const likedNewsIds = await UserLike.findAll({
				offset: offsetIndex * dataToFetch,
				limit: dataToFetch,
				where: {
					UserId: userId,
					type: "like",
				},
				order: [["createdAt", "DESC"]],
			})

			// get all the news based on the ids
			const news = await Promise.all(
				likedNewsIds.map(async ({ newsId }) => {
					const newsById = await News.findOne({ where: { id: newsId } })

					return newsById
				})
			)

			return news
		} catch (error) {
			return handleError("getNews", error)
		}
	}
}

module.exports = NewsAPI
