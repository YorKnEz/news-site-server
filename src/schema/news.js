const { gql, AuthenticationError, ForbiddenError } = require("apollo-server")

const { dataToFetch, evaluateImageLink, handleError } = require("../utils")

const typeDefs = gql`
	type Query {
		"Query to get news array for the home page"
		newsForHome(offsetIndex: Int): [News!]!
		"Query to get reddit news array for the home page"
		newsForHomeReddit(after: String): NewsForHomeRedditResponse!
		"Gets all the news of a specific author"
		newsForProfile(offsetIndex: Int, id: ID!): [News!]
		"Gets a news by id"
		news(id: ID!): News!
		"Gets the liked news by a user"
		likedNews(offsetIndex: Int): [News!]
	}

	type Mutation {
		"Creates a news based on input"
		createNews(newsData: NewsInput!): CreateNewsResponse!
		"Updates existing news in the db based on input"
		updateNews(newsData: NewsInput!, id: ID!): UpdateNewsResponse!
		"Deletes a news by id"
		deleteNews(id: ID!): DeleteNewsResponse!
	}

	input NewsInput {
		title: String!
		thumbnail: String
		sources: String!
		tags: String!
		body: String!
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

	type AddCommentResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"The comment"
		comment: Comment!
	}

	type NewsForHomeRedditResponse {
		after: String
		news: [News!]
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
	}
`

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
				return handleMutationError("createNews", error)
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
				return handleMutationError("updateNews", error)
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
}

module.exports = {
	newsSchema: typeDefs,
	newsResolvers: resolvers,
}
