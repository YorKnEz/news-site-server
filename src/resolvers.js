const {
	ForbiddenError,
	AuthenticationError,
	UserInputError,
} = require("apollo-server")

const { evaluateImageLink, handleError } = require("./utils")

// used for resolvers that return arrays
const dataToFetch = 4

const resolvers = {
	Query: {
		// returns an array of news created on the site that will be used to populate the homepage
		newsForHome: async (_, { offsetIndex }, { dataSources }) => {
			try {
				const news = await dataSources.newsAPI.getNews(
					offsetIndex,
					"created",
					dataToFetch
				)

				return news
			} catch (error) {
				return handleError("newsForHome", error)
			}
		},
		// returns an array of news created on the site that will be used to populate the homepage
		newsForHomeReddit: async (_, { after }, { dataSources }) => {
			try {
				// fetch news from r/Romania
				const { newAfter, fetchedNews } =
					await dataSources.redditAPI.getNewsFromRomania(after, dataToFetch)

				// add the newly fetched reddit news to the database
				const response = await dataSources.newsAPI.addNewsFromReddit(
					fetchedNews
				)

				// return the news and the offset for the next news
				return {
					news: response,
					after: newAfter,
				}
			} catch (error) {
				return handleError("newsForHomeReddit", error)
			}
		},
		// returns an array of news of a certain author to display on his profile
		newsForProfile: async (_, { offsetIndex, id }, { dataSources, token }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const news = await dataSources.newsAPI.getAuthorNews(
					offsetIndex,
					id,
					dataToFetch
				)

				return news
			} catch (error) {
				return handleError("newsForProfile", error)
			}
		},
		// returns a unique news with the specified id
		news: async (_, { id }, { dataSources }) => {
			try {
				const news = await dataSources.newsAPI.getNewsById(id)

				return news
			} catch (error) {
				return handleError("news", error)
			}
		},
		author: async (_, { id }, { dataSources, token }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const author = await dataSources.userAPI.getAuthorById(id)

				return {
					...author.toJSON(),
				}
			} catch (error) {
				return handleError("author", error)
			}
		},
		search: async (_, { search, filter }, { dataSources, token }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				switch (filter) {
					case "title":
						const newsTitle = await dataSources.newsAPI.searchNewsByTitle(
							search
						)

						return newsTitle
					case "body":
						const newsBody = await dataSources.newsAPI.searchNewsByBody(search)

						return newsBody
					case "author":
						const authors = await dataSources.userAPI.searchAuthors(search)

						return authors
					case "tags":
						const newsTags = await dataSources.newsAPI.searchNewsByTags(search)

						return newsTags
				}
			} catch (error) {
				return handleError("search", error)
			}
		},
		followedAuthors: async (
			_,
			{ offsetIndex },
			{ dataSources, token, userId }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const authors = await dataSources.userAPI.getFollowedAuthors(
					offsetIndex,
					userId,
					dataToFetch
				)

				return authors
			} catch (error) {
				return handleError("followedAuthors", error)
			}
		},
		likedNews: async (_, { offsetIndex }, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const news = await dataSources.newsAPI.getLikedNews(
					offsetIndex,
					userId,
					dataToFetch
				)

				return news
			} catch (error) {
				return handleError("likedNews", error)
			}
		},
	},
	Mutation: {
		createNews: async (
			_,
			{ newsData },
			{ dataSources, token, userRole, userId }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (userRole !== "author")
					throw new ForbiddenError("You must be an author to do this.")

				const newsId = await dataSources.newsAPI.createNews(newsData, userId)

				return {
					code: 200,
					success: true,
					message: "The news has been successfully created",
					id: newsId,
				}
			} catch (error) {
				return handleError("createNews", error)
			}
		},
		updateNews: async (
			_,
			{ newsData, id },
			{ dataSources, token, userId, userRole }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (userRole !== "author")
					throw new ForbiddenError("You must be an author to do this.")

				// handle news update
				const updatedNews = await dataSources.newsAPI.updateNews(
					newsData,
					id,
					userId
				)

				return {
					code: 200,
					success: true,
					message: "The news has been successfully updated",
					news: updatedNews,
				}
			} catch (error) {
				return handleError("updateNews", error)
			}
		},
		deleteNews: async (_, { id }, { dataSources, token, userId, userRole }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (userRole !== "author")
					throw new ForbiddenError("You must be an author to do this.")

				// handle news delete
				await dataSources.newsAPI.deleteNews(id, userId)

				return {
					code: 200,
					success: true,
					message: "The news has been successfully deleted",
				}
			} catch (error) {
				return handleError("deleteNews", error)
			}
		},
		voteNews: async (_, { action, id }, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (action === "like" || action === "dislike") {
					const response = await dataSources.newsAPI.voteNews(
						action,
						id,
						userId
					)

					return {
						code: 200,
						success: true,
						message: response.message,
						likes: response.likes,
						dislikes: response.dislikes,
					}
				} else {
					throw new UserInputError("Invalid action.")
				}
			} catch (error) {
				return handleError("voteNews", error)
			}
		},
	},
	News: {
		author: async ({ authorId, type }, _, { dataSources }) => {
			try {
				let returnData

				// available types: "reddit", "created"
				switch (type) {
					case "reddit":
						// author info
						const { data } = await dataSources.redditAPI.getAuthorById(authorId)

						returnData = {
							id: data.id,
							fullName: data.name,
							profilePicture: data.icon_img
								? evaluateImageLink(data.icon_img)
								: evaluateImageLink(data.snoovatar_img),
						}

						break
					case "created":
						const author = await dataSources.userAPI.getAuthorById(authorId)

						returnData = {
							id: author.id,
							fullName: author.fullName,
							profilePicture: author.profilePicture,
						}

						break
				}

				return returnData
			} catch (error) {
				return handleError("author", error)
			}
		},
		voteState: async ({ id }, _, { dataSources, userId }) => {
			try {
				if (userId) return dataSources.newsAPI.getVoteState(id, userId)

				return "none"
			} catch (error) {
				return handleError("voteState", error)
			}
		},
	},
	Author: {
		following: async ({ id }, _, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const result = await dataSources.userfollowAPI.isFollowing(id, userId)

				return result
			} catch (error) {
				return handleError("following", error)
			}
		},
	},
}

module.exports = resolvers
