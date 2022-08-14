const {
	gql,
	AuthenticationError,
	ForbiddenError,
	UserInputError,
} = require("apollo-server")

const { dataToFetch, handleMutationError, GenericError } = require("../utils")

const typeDefs = gql`
	union Item = News | CommentCard

	type Query {
		"Gets the liked news and comments by a user"
		liked(oldestId: ID!, oldestType: String!, userId: ID!): [Item!]
		"Gets the saved news and comments by a user"
		saved(oldestId: ID!, oldestType: String!, userId: ID!): [Item!]
	}

	type Mutation {
		"Toggle vote. Action can be either 'like' or 'dislike'"
		vote(action: String!, parentId: ID!, parentType: String!): VoteResponse!
		"Save a news or comment. Action can be either 'save' or 'unsave'"
		save(action: String!, parentId: ID!, parentType: String!): SaveResponse!
	}

	type VoteResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"The new score of the item"
		score: Int!
	}

	type SaveResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
	}

	type CommentCard {
		comment: Comment!
		news: NewsShort
	}
`

const resolvers = {
	Query: {
		liked: async (
			_,
			{ oldestId, oldestType, userId },
			{ dataSources, token }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const items = await dataSources.commonAPI.getLiked(
					oldestId,
					oldestType,
					userId,
					dataToFetch
				)

				return items
			} catch (error) {
				throw new GenericError("liked", error)
			}
		},
		saved: async (
			_,
			{ oldestId, oldestType, userId },
			{ dataSources, token }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const items = await dataSources.commonAPI.getSaved(
					oldestId,
					oldestType,
					userId,
					dataToFetch
				)

				return items
			} catch (error) {
				throw new GenericError("saved", error)
			}
		},
	},
	Mutation: {
		vote: async (
			_,
			{ action, parentId, parentType },
			{ dataSources, token, userId }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (action === "like" || action === "dislike") {
					const response = await dataSources.commonAPI.vote(
						action,
						parentId,
						parentType,
						userId
					)

					return {
						code: 200,
						success: true,
						message: response.message,
						score: response.score,
					}
				} else {
					throw new UserInputError("Invalid action.")
				}
			} catch (error) {
				return {
					...handleMutationError("vote", error),
					score: 0,
				}
			}
		},
		save: async (
			_,
			{ action, parentId, parentType },
			{ dataSources, token, userId }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (action === "save" || action === "unsave") {
					const response = await dataSources.commonAPI.save(
						action,
						parentId,
						parentType,
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
				return handleMutationError("save", error)
			}
		},
	},
	CommentCard: {
		news: async ({ comment }, _, { dataSources }) => {
			try {
				return dataSources.newsAPI.getNewsById(comment.newsId)
			} catch (error) {
				throw new GenericError("news", error)
			}
		},
	},
	Item: {
		__resolveType: async ({ title, comment }) => {
			// only news have a title
			if (title !== undefined) return "News"

			// only comment cards have a comment
			if (comment !== undefined) return "CommentCard"

			// throw an error
			return null
		},
	},
}

module.exports = {
	commonSchema: typeDefs,
	commonResolvers: resolvers,
}
