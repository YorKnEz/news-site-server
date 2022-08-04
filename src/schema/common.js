const {
	gql,
	AuthenticationError,
	ForbiddenError,
	UserInputError,
} = require("apollo-server")

const { dataToFetch, handleError, handleMutationError } = require("../utils")

const typeDefs = gql`
	type Mutation {
		"Toggle vote. Action can be either 'like' or 'dislike'"
		vote(action: String!, parentId: ID!, parentType: String!): VoteResponse!
	}

	type VoteResponse {
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
`

const resolvers = {
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
						likes: response.likes,
						dislikes: response.dislikes,
					}
				} else {
					throw new UserInputError("Invalid action.")
				}
			} catch (error) {
				return {
					...handleMutationError("vote", error),
					likes: 0,
					dislikes: 0,
				}
			}
		},
	},
}

module.exports = {
	commonSchema: typeDefs,
	commonResolvers: resolvers,
}
