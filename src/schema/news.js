const { gql, AuthenticationError, ForbiddenError } = require("apollo-server")

const {
	dataToFetch,
	evaluateImageLink,
	handleMutationError,
	GenericError,
} = require("../utils")

const typeDefs = gql`
	type Query {
		"Query to get news array for the home page"
		newsForHome(oldestId: ID!, sortBy: String!, followed: Boolean): [News!]!
		"Query to get reddit news array for the home page"
		newsForHomeReddit(after: String): NewsForHomeRedditResponse!
		"Gets all the news of a specific author"
		newsForProfile(oldestId: ID!, id: ID!): [News!]
		"Gets a news by id"
		news(id: ID!): News!
		"News to display on an author's profile card"
		newsForProfileCard(
			id: ID
			newsId: ID
			howManyBest: Int!
			howManyRecent: Int!
		): NewsForProfiledCardResponse
	}

	type Mutation {
		"Creates a news based on input"
		createNews(newsData: NewsInput!): CreateNewsResponse!
		"Updates existing news in the db based on input"
		updateNews(newsData: NewsInput!, id: ID!): UpdateNewsResponse!
		"Deletes a news by id"
		deleteNews(id: ID): DeleteNewsResponse!
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

	type NewsForProfiledCardResponse {
		best: [News!]
		recent: [News!]
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
		body: String!
		"The type of the news: either 'reddit'(if it's from reddit) or 'created'(if it's from news-site)"
		type: String!
		"The creation date of the news"
		createdAt: String!
		"Wether the user already voted the news. Can be 'like', 'dislike' or 'none'"
		voteState: String!
		"The number of likes the post has"
		likes: Int!
		"The number of dislikes the post has"
		dislikes: Int!
		"The score of the news. The score is the difference between likes and dislikes."
		score: Int!
		"The number of comments"
		replies: Int
		"Wether the news has been saved or not. Can be either 'save', 'unsave'"
		saveState: String!
		"The link of the news, formatted."
		link: String
	}

	type NewsShort {
		id: ID!
		"The news' title"
		title: String!
		"The creator of the news"
		author: AuthorShort!
		"The type of the news: either 'reddit'(if it's from reddit) or 'created'(if it's from news-site)"
		type: String!
		"The link of the news, formatted."
		link: String
	}
`

const resolvers = {
	Query: {
		// returns an array of news created on the site that will be used to populate the homepage
		newsForHome: async (
			_,
			{ oldestId, sortBy, followed },
			{ dataSources, token, userId }
		) => {
			try {
				if (followed && !token)
					throw new AuthenticationError("You must be authenticated to do this.")

				switch (sortBy) {
					case "date":
						return dataSources.newsAPI.getNewsByDate(
							oldestId,
							followed ? userId : undefined,
							dataToFetch
						)
					case "score":
						return dataSources.newsAPI.getNewsByScore(
							oldestId,
							followed ? userId : undefined,
							dataToFetch
						)
					default:
						return null
				}
			} catch (error) {
				throw new GenericError("newsForHome", error)
			}
		},
		// returns an array of news created on the site that will be used to populate the homepage
		newsForHomeReddit: async (_, { after }, { dataSources }) => {
			try {
				// fetch news from r/Romania
				const { newAfter, fetchedNews } =
					await dataSources.redditAPI.getNewsFromRomania(after, dataToFetch)

				// return the news and the offset for the next news
				return {
					news: await dataSources.newsAPI.addNewsFromReddit(fetchedNews),
					after: newAfter,
				}
			} catch (error) {
				throw new GenericError("newsForHomeReddit", error)
			}
		},
		// returns an array of news of a certain author to display on his profile
		newsForProfile: async (_, { oldestId, id }, { dataSources, token }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				return dataSources.newsAPI.getAuthorNews(oldestId, id, dataToFetch)
			} catch (error) {
				throw new GenericError("newsForProfile", error)
			}
		},
		// returns a unique news with the specified id
		news: async (_, { id }, { dataSources }) => {
			try {
				return dataSources.newsAPI.getNewsById(id)
			} catch (error) {
				// return handleError("news", error)
				throw new GenericError("news", error)
			}
		},
		newsForProfileCard: async (
			_,
			{ id, newsId, howManyBest, howManyRecent },
			{ dataSources, token }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (newsId) {
					const { authorId } = await dataSources.newsAPI.getNewsById(newsId)

					return dataSources.newsAPI.getNewsForProfileCard(
						authorId,
						howManyBest,
						howManyRecent
					)
				}

				return dataSources.newsAPI.getNewsForProfileCard(
					id,
					howManyBest,
					howManyRecent
				)
			} catch (error) {
				throw new GenericError("newsForProfileCard", error)
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

				return {
					code: 200,
					success: true,
					message: "The news has been successfully created",
					id: await dataSources.newsAPI.createNews(newsData, userId),
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
				await dataSources.newsAPI.updateNews(newsData, id, userId)

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
						returnData = dataSources.userAPI.getAuthorById(authorId)

						break
					case "[deleted]":
						returnData = {
							id: "[deleted]",
							fullName: "[deleted]",
							profilePicture: "default",
						}
						break
				}

				return returnData
			} catch (error) {
				throw new GenericError("author", error)
			}
		},
		voteState: async ({ id }, _, { dataSources, userId }) => {
			try {
				if (userId)
					return dataSources.commonAPI.getVoteState(id, "news", userId)

				return "none"
			} catch (error) {
				throw new GenericError("voteState", error)
			}
		},
		saveState: async ({ id }, _, { dataSources, userId }) => {
			try {
				if (userId)
					return dataSources.commonAPI.getSaveState(id, "news", userId)

				return "unsave"
			} catch (error) {
				throw new GenericError("saveState", error)
			}
		},
	},
	NewsShort: {
		author: async ({ authorId, type }, _, { dataSources }) => {
			try {
				let returnData

				// available types: "reddit", "created"
				switch (type) {
					case "created":
						returnData = dataSources.userAPI.getAuthorById(authorId)

						break
					case "[deleted]":
						returnData = {
							id: "[deleted]",
							fullName: "[deleted]",
							profilePicture: "default",
						}
						break
				}

				return returnData
			} catch (error) {
				throw new GenericError("author", error)
			}
		},
	},
}

module.exports = {
	newsSchema: typeDefs,
	newsResolvers: resolvers,
}
