const {
	gql,
	AuthenticationError,
	ForbiddenError,
	UserInputError,
} = require("apollo-server")

const {
	dataToFetch,
	evaluateImageLink,
	handleError,
	handleMutationError,
} = require("../utils")

const typeDefs = gql`
	type Query {
		"Query to get news array for the home page"
		newsForHome(oldestId: ID!): [News!]!
		"Query to get reddit news array for the home page"
		newsForHomeReddit(after: String): NewsForHomeRedditResponse!
		"Gets all the news of a specific author"
		newsForProfile(oldestId: ID!, id: ID!): [News!]
		"Gets a news by id"
		news(id: ID!): News!
		"Gets the liked news by a user"
		likedNews(oldestId: ID!): [News!]
		"Gets the saved news by a user"
		savedNews(oldestId: ID!): [News!]
	}

	type Mutation {
		"Creates a news based on input"
		createNews(newsData: NewsInput!): CreateNewsResponse!
		"Updates existing news in the db based on input"
		updateNews(newsData: NewsInput!, id: ID!): UpdateNewsResponse!
		"Deletes a news by id"
		deleteNews(id: ID!): DeleteNewsResponse!

		"Toggle vote news. Action can be either 'like' or 'dislike'"
		voteNews(action: String!, id: ID!): VoteNewsResponse!
		"Increase or decrease the comments counter of a news"
		updateCommentsCounter(
			action: String!
			id: ID!
		): UpdateCommentsCounterResposne!

		"Save a news. Action can be either 'save' or 'unsave'"
		saveNews(action: String!, id: ID!): SaveNewsResponse!
	}

	input NewsInput {
		title: String!
		thumbnail: String
		sources: String!
		tags: String!
		body: String!
	}

	type NewsForHomeRedditResponse {
		after: String
		news: [News!]
	}

	type CreateNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"The id of the news that has been created"
		id: ID!
	}

	type UpdateNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
	}

	type DeleteNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
	}

	type VoteNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"Updated number of likes"
		likes: Int!
		"Updated number of dislikes"
		dislikes: Int!
	}

	type UpdateCommentsCounterResposne {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"Updated number of comments"
		comments: Int!
	}

	type SaveNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
	}

	"This is the structure of a news"
	type News {
		id: ID!
		"The news' title"
		title: String!
		"The creator of the news"
		author: AuthorShort!
		"The picture to display in the home page or the news page"
		thumbnail: String
		"The subreddit the news originates from prefixed with r/"
		subreddit: String
		"The source of the news"
		sources: String!
		"The tags of the news, that help for better searching"
		tags: String
		"The body of the news"
		body: String
		"The type of the news: either 'reddit'(if it's from reddit) or 'created'(if it's from news-site)"
		type: String!
		"The creation date of the news"
		createdAt: String!
		"The last time the news was edited"
		updatedAt: String!
		"Wether the user already voted the news. Can be 'like', 'dislike' or 'none'"
		voteState: String!
		"The number of likes the post has"
		likes: Int!
		"The number of dislikes the post has"
		dislikes: Int!
		"The number of comments"
		comments: Int
		"Wether the news has been saved or not. Can be either 'save', 'unsave'"
		saveState: String!
	}
`

const resolvers = {
	Query: {
		// returns an array of news created on the site that will be used to populate the homepage
		newsForHome: async (_, { oldestId }, { dataSources }) => {
			try {
				const news = await dataSources.newsAPI.getNews(oldestId, dataToFetch)

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
		newsForProfile: async (_, { oldestId, id }, { dataSources, token }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const news = await dataSources.newsAPI.getAuthorNews(
					oldestId,
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
		likedNews: async (_, { oldestId }, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const news = await dataSources.newsAPI.getLikedNews(
					oldestId,
					userId,
					dataToFetch
				)

				return news
			} catch (error) {
				return handleError("likedNews", error)
			}
		},
		savedNews: async (_, { oldestId }, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const news = await dataSources.newsAPI.getSavedNews(
					oldestId,
					userId,
					dataToFetch
				)

				return news
			} catch (error) {
				return handleError("savedNews", error)
			}
		},
	},
	Mutation: {
		createNews: async (
			_,
			{ newsData },
			{ dataSources, token, userRole, userId, verified }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (userRole !== "author")
					throw new ForbiddenError("You must be an author to do this.")

				if (!verified)
					throw new ForbiddenError(
						"You must verify your email to perform this action."
					)

				const newsId = await dataSources.newsAPI.createNews(newsData, userId)

				return {
					code: 200,
					success: true,
					message: "The news has been successfully created",
					id: newsId,
				}
			} catch (error) {
				return {
					...handleMutationError("createNews", error),
					id: 0,
				}
			}
		},
		updateNews: async (
			_,
			{ newsData, id },
			{ dataSources, token, userId, userRole, verified }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (userRole !== "author")
					throw new ForbiddenError("You must be an author to do this.")

				if (!verified)
					throw new ForbiddenError(
						"You must verify your email to perform this action."
					)

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
				}
			} catch (error) {
				return handleMutationError("updateNews", error)
			}
		},
		deleteNews: async (
			_,
			{ id },
			{ dataSources, token, userId, userRole, verified }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (userRole !== "author")
					throw new ForbiddenError("You must be an author to do this.")

				if (!verified)
					throw new ForbiddenError(
						"You must verify your email to perform this action."
					)

				// handle news delete
				await dataSources.newsAPI.deleteNews(id, userId)

				return {
					code: 200,
					success: true,
					message: "The news has been successfully deleted",
				}
			} catch (error) {
				return handleMutationError("deleteNews", error)
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
				return {
					...handleMutationError("voteNews", error),
					likes: 0,
					dislikes: 0,
				}
			}
		},
		updateCommentsCounter: async (
			_,
			{ action, id },
			{ dataSources, token }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const comments = dataSources.newsAPI.updateCommentsCounter(action, id)

				return {
					code: 200,
					success: true,
					message: "Updated counter successfully",
					comments,
				}
			} catch (error) {
				return {
					...handleMutationError("updateCommentsCounter", error),
					comments: 0,
				}
			}
		},
		saveNews: async (_, { action, id }, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (action === "save" || action === "unsave") {
					const response = await dataSources.newsAPI.saveNews(
						action,
						id,
						userId
					)

					return {
						code: response.code,
						success: response.success,
						message: response.message,
					}
				} else {
					throw new UserInputError("Invalid action.")
				}
			} catch (error) {
				return handleMutationError("saveNews", error)
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
				if (userId) return dataSources.newsAPI.getVoteState(id, "news", userId)

				return "none"
			} catch (error) {
				return handleError("voteState", error)
			}
		},
		saveState: async ({ id }, _, { dataSources, userId }) => {
			try {
				if (userId) return dataSources.newsAPI.getSaveState(id, "news", userId)

				return "unsave"
			} catch (error) {
				return handleError("saveState", error)
			}
		},
	},
}

module.exports = {
	newsSchema: typeDefs,
	newsResolvers: resolvers,
}
