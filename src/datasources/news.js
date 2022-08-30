const { DataSource } = require("apollo-datasource")
const { ForbiddenError, UserInputError } = require("apollo-server")
const fs = require("fs")
const { Op } = require("sequelize")

const { News, User, UserFollow } = require("../database")
const { sequelize } = require("../database/sequelize")
const { formatTitle, GenericError, dataToFetch } = require("../utils")

// required for getting the thumbnail name of a news to delete it
const hostIp = process.env.HOST_IP
const port = process.env.EXPRESS_SERVER_PORT

class NewsAPI extends DataSource {
	constructor() {
		super()
	}
	// retrieve [newsToFetch] news based on the oldest fetched news id

	async getNewsByDate(oldestId, userId, dataToFetch) {
		try {
			// find the oldest news
			const oldestNews = await News.findOne({
				where: { id: oldestId },
			})

			// add the additional options if there is an oldest news
			const options = {
				limit: dataToFetch,
				where: { type: "created" },
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			}

			if (oldestNews) {
				options.where.createdAt = { [Op.lte]: oldestNews.createdAt }
				options.where.id = { [Op.lt]: oldestId }
			}

			if (userId) {
				const followedAuthors = await UserFollow.findAll({
					where: { UserId: userId },
				})

				const authorIds = followedAuthors.map(a => a.authorId)

				options.where.authorId = { [Op.in]: authorIds }
			}

			// get the news
			return News.findAll(options)
		} catch (error) {
			throw new GenericError("getNewsByDate", error)
		}
	}

	async getNewsByScore(oldestId, userId, dataToFetch) {
		try {
			// find the oldest news
			let oldestNews = await News.findOne({
				where: { id: oldestId },
			})

			// add the additional options if there is an oldest news
			let options = {
				limit: dataToFetch,
				where: { type: "created" },
				order: [
					["score", "DESC"],
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			}

			if (oldestNews) {
				options.where.score = { [Op.eq]: oldestNews.score }
				options.where.createdAt = { [Op.lte]: oldestNews.createdAt }
				options.where.id = { [Op.not]: oldestNews.id }
			}

			if (userId) {
				const followedAuthors = await UserFollow.findAll({
					where: { UserId: userId },
				})

				const authorIds = followedAuthors.map(a => a.authorId)

				options.where.authorId = { [Op.in]: authorIds }
			}

			const news = await News.findAll(options)

			// if the fetched news are less that the max, try to fetch more
			if (news.length < dataToFetch) {
				// the oldestNews becomes the last fetched news by the query above or remains the same
				oldestNews = news.length > 0 ? news[news.length - 1] : oldestNews

				options.limit = dataToFetch - news.length

				// reset options
				const { authorId, type } = options.where

				options.where = { type }
				if (userId) options.where.authorId = authorId

				if (oldestNews) {
					options.where.score = { [Op.lt]: oldestNews.score }
				}

				const restOfNews = await News.findAll(options)

				return [...news, ...restOfNews]
			}

			return news
		} catch (error) {
			throw new GenericError("getNewsByScore", error)
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
			const options = {
				limit: dataToFetch,
				where: { type: "created", authorId: author.id },
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			}

			if (oldestNews) {
				options.where.createdAt = { [Op.lte]: oldestNews.createdAt }
				options.where.id = { [Op.lt]: oldestId }
			}

			return News.findAll(options)
		} catch (error) {
			throw new GenericError("getAuthorNews", error)
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

			if (!news) throw new GenericError("News not in our database")

			return news
		} catch (error) {
			throw new GenericError("getNewsById", error)
		}
	}

	// retrieve 2 of the best news and the most recent one of a certain author
	async getNewsForProfileCard(authorId, howManyBest, howManyRecent) {
		try {
			const bestNews = await News.findAll({
				limit: howManyBest,
				where: {
					authorId,
				},
				order: [
					["score", "DESC"],
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			const mostRecentNews = await News.findAll({
				limit: howManyRecent,
				where: {
					authorId,
				},
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			return { best: bestNews, recent: mostRecentNews }
		} catch (error) {
			throw new GenericError("getNewsForProfileCard", error)
		}
	}

	// adds news from RedditAPI to the database
	// news is an array
	async addNewsFromReddit(newsData) {
		try {
			// map through the news
			return Promise.all(
				newsData.map(async ({ data }) => {
					// try to find if the current news has already been added
					const news = await News.findOne({
						where: { redditId: data.id },
					})

					// if the news exists, return it
					if (news) return news

					// if it doesn't exist, create it and return it
					return News.create({
						redditId: data.id,
						title: formatTitle(data.title),
						authorId: data.author,
						createdAt: data.created * 1000,
						thumbnail: "",
						subreddit: data.subreddit_name_prefixed,
						sources: "https://www.reddit.com" + data.permalink,
						body: data.selftext ? data.selftext : "",
						type: "reddit",
					})
				})
			)
		} catch (error) {
			throw new GenericError("addNewsFromReddit", error)
		}
	}

	async searchNews(search, searchBy, fetchedResults) {
		try {
			return sequelize.query(
				`
				SELECT * FROM "News"
				WHERE ${searchBy !== "all" ? searchBy : "all_search"} @@ to_tsquery(:search)
				AND "authorId" != '-1'
				LIMIT :limit
				OFFSET :offset;
				`,
				{
					model: News,
					replacements: {
						search: search.split(" ").join(" | "),
						limit: dataToFetch,
						offset: fetchedResults,
					},
				}
			)
		} catch (error) {
			throw new GenericError("searchNews", error)
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
				link: newsData.title.replace(/(\W+)/g, "-").toLowerCase(),
			})

			await news.update({
				all_search: sequelize.fn(
					"to_tsvector",
					sequelize.fn(
						"concat",
						sequelize.col("title"),
						sequelize.col("body"),
						sequelize.col("tags")
					)
				),
			})

			await news.save()

			// increment the users writtenNews
			await user.update({
				writtenNews: user.writtenNews + 1,
			})

			// save the changes to the user
			await user.save()

			// return the id of the news
			return news.id
		} catch (error) {
			throw new GenericError("createNews", error)
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
			if (newsData.thumbnail && news.thumbnail) {
				const thumbnail = news.thumbnail.replace(
					`${hostIp}:${port}/public/`,
					""
				)

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
				link: newsData.title.replace(/(\W+)/g, "-").toLowerCase(),
			})

			await news.update({
				all_search: sequelize.fn(
					"to_tsvector",
					sequelize.fn(
						"concat",
						sequelize.col("title"),
						sequelize.col("body"),
						sequelize.col("tags")
					)
				),
			})

			// save changes
			await news.save()

			// return the updated news
			return news
		} catch (error) {
			throw new GenericError("updateNews", error)
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

			if (news.thumbnail) {
				const thumbnail = news.thumbnail.replace(
					`${hostIp}:${port}/public/`,
					""
				)

				// delete the thumbnail from the server
				fs.unlink(`./public/${thumbnail}`, err => {
					if (err) console.log(err)
				})
			}

			// delete the news
			await news.update({
				title: "[deleted]",
				authorId: "-1",
				sources: "[deleted]",
				tags: "[deleted]",
				body: "<p>[deleted]</p>",
				type: "[deleted]",
			})

			await news.update({
				all_search: sequelize.fn(
					"to_tsvector",
					sequelize.fn(
						"concat",
						sequelize.col("title"),
						sequelize.col("body"),
						sequelize.col("tags")
					)
				),
			})

			// save changes
			await news.save()

			// update the number of written news of the user
			await user.update({
				writtenNews: user.writtenNews - 1,
			})

			// save the changes
			await user.save()
		} catch (error) {
			throw new GenericError("deleteNews", error)
		}
	}
}

module.exports = NewsAPI
