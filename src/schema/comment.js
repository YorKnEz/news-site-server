const { gql, AuthenticationError, ForbiddenError } = require("apollo-server")

const { dataToFetch, handleError, handleMutationError } = require("../utils")

const typeDefs = gql`
	type Query {
		"Gets comments of a certain post"
		commentsForNews(offsetIndex: Int, newsId: ID!): [Comment!]
	}

	type Mutation {
		"Add a comment"
		addComment(commentData: CommentInput!): CommentResponse!
		"Edit a comment"
		editComment(commentData: CommentInput!): CommentResponse!
		"Remove a comment"
		removeComment(id: ID!): RemoveCommentResponse!
	}

	input CommentInput {
		parentId: ID!
		parentType: String!
		body: String!
	}

	type CommentResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"The comment"
		comment: Comment!
	}

	type RemoveCommentResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
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
		addComment: async (_, { commentData }, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const comment = await dataSources.commentAPI.addComment(
					commentData,
					userId
				)

				return {
					code: 200,
					success: true,
					message: "Added comment successfully.",
					comment,
				}
			} catch (error) {
				return handleMutationError("addComment", error)
			}
		},
		editComment: async (_, { commentData }, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				const comment = await dataSources.commentAPI.editComment(
					commentData,
					userId
				)

				return {
					code: 200,
					success: true,
					message: "Edited comment successfully.",
					comment,
				}
			} catch (error) {
				return handleMutationError("updateComment", error)
			}
		},
		removeComment: async (_, { id }, { dataSources, token, userId }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				await dataSources.commentAPI.removeComment(id, userId)

				return {
					code: 200,
					success: true,
					message: "Removed comment successfully.",
				}
			} catch (error) {
				return handleMutationError("removeComment", error)
			}
		},
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
