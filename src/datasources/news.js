const { DataSource } = require("apollo-datasource")
const { ForbiddenError, UserInputError } = require("apollo-server")
const fs = require("fs")
const { Op } = require("sequelize")

const { News, User, UserVote, UserSave } = require("../database")
const { formatTitle, handleError } = require("../utils")

// required for getting the thumbnail name of a news to delete it
const ip = process.env.EXPRESS_SERVER_IP

class NewsAPI extends DataSource {
	constructor() {
		super()
	}
	// retrieve [newsToFetch] news based on the oldest fetched news id

	async getNews(oldestId, dataToFetch) {
		try {
			// find the oldest news
			const oldestNews = await News.findOne({
				where: { id: oldestId },
			})

			// add the additional options if there is an oldest news
			const options = {}

			if (oldestNews) {
				options.createdAt = { [Op.lte]: oldestNews.createdAt }
				options.id = { [Op.lt]: oldestId }
			}

			options.type = "created"

			// get the news
			const news = await News.findAll({
				limit: dataToFetch,
				where: options,
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			return news
		} catch (error) {
			return handleError("getNews", error)
		}
	}

	// retrieve [dataToFetch] liked news based on an offset
	async getLikedNews(offset, userId, dataToFetch) {
		try {
			// retrieve all the ids of the liked news
			const likedNewsIds = await UserVote.findAll({
				offset,
				limit: dataToFetch,
				where: {
					UserId: userId,
					type: "like",
				},
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			// get all the news based on the ids
			const news = await Promise.all(
				likedNewsIds.map(async ({ parentId }) => {
					const newsById = await News.findOne({ where: { id: parentId } })

					return newsById
				})
			)

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

	// retrieve [newsToFetch] news of a certain author basend on the oldest fetched author id
	async getAuthorNews(oldestId, id, dataToFetch) {
		try {
			const author = await User.findOne({
				where: {
					id,
				},
			})

			// find the oldest news
			const oldestNews = await News.findOne({
				where: { id: oldestId },
			})

			// add the additional options if there is an oldest news
			const options = {}

			if (oldestNews) {
				options.createdAt = { [Op.lte]: oldestNews.createdAt }
				options.id = { [Op.lt]: oldestId }
			}

			options.type = "created"
			options.authorId = author.id

			const news = await News.findAll({
				limit: dataToFetch,
				where: options,
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
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
					createdAt: data.created * 1000,
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
			const link1 = await UserVote.findOne({
				where: {
					parentId: newsId,
					parentType: "news",
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
			const link2 = await UserVote.findOne({
				where: {
					parentId: newsId,
					parentType: "news",
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
			await UserVote.create({
				UserId: userId,
				parentId: newsId,
				parentType: "news",
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

	async getVoteState(parentId, parentType, userId) {
		try {
			// find if the user liked or disliked the news
			const link = await UserVote.findOne({
				where: {
					UserId: userId,
					parentId,
					parentType,
					type: { [Op.or]: ["like", "dislike"] },
				},
			})

			if (!link) return "none"

			return link.type
		} catch (error) {
			return handleError("voteState", error)
		}
	}

	// update the comments counter of the news
	async updateCommentsCounter(action, newsId) {
		try {
			// get the news
			const news = await News.findOne({
				where: { id: newsId },
			})

			// if the news is not found, throw an error
			if (!news) throw new UserInputError("Invalid input.")

			if (action === "up") await news.update({ comments: news.comments + 1 })

			if (action === "down") await news.update({ comments: news.comments - 1 })

			await news.save()

			return news.comments
		} catch (error) {
			return handleError("updateCommentsCounter", error)
		}
	}

	async saveNews(action, newsId, userId) {
		try {
			// try to find if the news has already been saved
			const link = await UserSave.findOne({
				where: {
					parentId: newsId,
					parentType: "news",
					UserId: userId,
				},
			})

			// if the news hasn't been saved but the action is "save", save it
			if (!link && action === "save") {
				await UserSave.create({
					parentId: newsId,
					parentType: "news",
					UserId: userId,
				})

				return {
					code: 200,
					success: true,
					message: "News saved successfully",
				}
			}

			if (link && action === "unsave") {
				await link.destroy()

				return {
					code: 200,
					success: true,
					message: "News unsaved successfully",
				}
			}

			return {
				code: 400,
				success: false,
				message: "Invalid action",
			}
		} catch (error) {
			return handleError("saveNews", error)
		}
	}

	async getSaveState(parentId, parentType, userId) {
		try {
			// see if the
			const link = await UserSave.findOne({
				where: {
					parentId,
					parentType,
					UserId: userId,
				},
			})

			// if the link exists the state is saved
			if (link) return "save"

			// if not then the state is unsaved
			return "unsave"
		} catch (error) {
			return handleError("getSaveState", error)
		}
	}
}

module.exports = NewsAPI
