const { gql, AuthenticationError, ForbiddenError } = require("apollo-server")

const { dataToFetch, handleError, handleMutationError } = require("../utils")

const typeDefs = gql`
	type Query {
		"Gets comments of a certain post"
		commentsForNews(offsetIndex: Int, newsId: ID!): [Comment!]
	}

	type Mutation {
	}


	type Comment {
		id: ID!
		"The id of the parent of the comment"
		parentId: ID!
		"The type of the parent of the comment"
		parentType: String!
		"The body of the comment"
		body: String!
		"The number of likes of the comment"
		likes: Int!
		"The number of dislikes of the comment"
		dislikes: Int!
		"The date when the comment was created"
		createdAt: String!
		"The replies"
		replies: [Comment!]
		"The replies' offsetIndex, for fetching the next replies in the array"
		repliesOffsetIndex: Int
	}
`

const resolvers = {
	Query: {
		commentsForNews: async (
			_,
			{ offsetIndex, newsId },
			{ dataSources, userId }
		) => {
			try {
				const comments = await dataSources.commentAPI.getComments(
					offsetIndex,
					newsId,
					"news",
					userId,
					dataToFetch
				)

				return comments
			} catch (error) {
				return handleError("commentForNews", error)
			}
		},
	},
	Mutation: {
	},
	Comment: {
		replies: async ({ id, repliesOffsetIndex }, _, { dataSources, userId }) => {
			try {
				// get the first [dataToFetch] replies of a certain comments
				const comments = await dataSources.commentAPI.getComments(
					repliesOffsetIndex, // the offsetIndex
					id,
					"comment",
					userId,
					dataToFetch
				)

				return comments
			} catch (error) {
				return handleError("replies", error)
			}
		},
	},
}

module.exports = {
	commentSchema: typeDefs,
	commentResolvers: resolvers,
}
