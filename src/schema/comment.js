const { gql, AuthenticationError, ForbiddenError } = require("apollo-server")

const { dataToFetch, handleMutationError, GenericError } = require("../utils")

const typeDefs = gql`
	type Query {
		"Gets comments of a certain post"
		commentsForNews(oldestId: ID!, newsId: ID!, sortBy: String!): [Comment!]
		"Gets replies of a certain comment"
		commentReplies(oldestId: ID!, commentId: ID!, sortBy: String!): [Comment!]
	}

	type Mutation {
		"Add a comment"
		addComment(commentData: CommentInput!): CommentResponse!
		"Edit a comment"
		editComment(commentData: CommentInput!, id: ID!): CommentResponse!
		"Remove a comment"
		removeComment(id: ID!): CommentResponse!
	}

	input CommentInput {
		newsId: ID!
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
		comment: Comment
	}

	type Comment {
		id: ID!
		"The author of the comment"
		author: AuthorShort!
		"The id of the parent of the comment"
		parentId: ID!
		"The type of the parent of the comment"
		parentType: String!
		"The body of the comment"
		body: String!
		"Wether the user already voted the comment. Can be 'like', 'dislike' or 'none'"
		voteState: String!
		"The number of likes of the comment"
		likes: Int!
		"The number of dislikes of the comment"
		dislikes: Int!
		"The score of the news. The score is the difference between likes and dislikes."
		score: Int!
		"The date when the comment was created"
		createdAt: String!
		"The number of replies"
		replies: Int
		"Wether the comment has been saved or not. Can be either 'save', 'unsave'"
		saveState: String!
	}
`

const resolvers = {
	Query: {
		commentsForNews: async (
			_,
			{ newsId, oldestId, sortBy },
			{ dataSources }
		) => {
			try {
				if (sortBy === "date") {
					return dataSources.commentAPI.getCommentsByDate(
						oldestId,
						newsId,
						"news",
						dataToFetch
					)
				}

				if (sortBy === "score") {
					return dataSources.commentAPI.getCommentsByScore(
						oldestId,
						newsId,
						"news",
						dataToFetch
					)
				}

				return null
			} catch (error) {
				throw new GenericError("commentForNews", error)
			}
		},
		commentReplies: async (
			_,
			{ commentId, oldestId, sortBy },
			{ dataSources }
		) => {
			try {
				if (sortBy === "date") {
					return dataSources.commentAPI.getCommentsByDate(
						oldestId,
						commentId,
						"comment",
						dataToFetch
					)
				}

				if (sortBy === "score") {
					return dataSources.commentAPI.getCommentsByScore(
						oldestId,
						commentId,
						"comment",
						dataToFetch
					)
				}

				return null
			} catch (error) {
				throw new GenericError("commentReplies", error)
			}
		},
	},
	Mutation: {
		addComment: async (
			_,
			{ commentData },
			{ dataSources, token, userId, verified }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (!verified)
					throw new ForbiddenError(
						"You must verify your email to perform this action."
					)

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
		editComment: async (
			_,
			{ commentData, id },
			{ dataSources, token, userId, verified }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (!verified)
					throw new ForbiddenError(
						"You must verify your email to perform this action."
					)

				const comment = await dataSources.commentAPI.editComment(
					commentData,
					userId,
					id
				)

				return {
					code: 200,
					success: true,
					message: "Edited comment successfully.",
					comment,
				}
			} catch (error) {
				return handleMutationError("editComment", error)
			}
		},
		removeComment: async (
			_,
			{ id },
			{ dataSources, token, userId, verified }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				if (!verified)
					throw new ForbiddenError(
						"You must verify your email to perform this action."
					)

				const comment = await dataSources.commentAPI.removeComment(id, userId)

				return {
					code: 200,
					success: true,
					message: "Removed comment successfully.",
					comment,
				}
			} catch (error) {
				return handleMutationError("removeComment", error)
			}
		},
	},
	Comment: {
		author: async ({ body, UserId }, _, { dataSources }) => {
			try {
				if (body === "<p>[deleted]</p>") {
					return {
						id: "[deleted]",
						fullName: "[deleted]",
						profilePicture: "default",
					}
				}

				const user = await dataSources.userAPI.getUserById(UserId)

				return {
					id: user.id,
					fullName: user.fullName,
					profilePicture: user.profilePicture,
				}
			} catch (error) {
				throw new GenericError("author", error)
			}
		},
		voteState: async ({ id }, _, { dataSources, userId }) => {
			try {
				if (userId)
					return dataSources.commonAPI.getVoteState(id, "comment", userId)

				return "none"
			} catch (error) {
				throw new GenericError("voteState", error)
			}
		},
		saveState: async ({ id }, _, { dataSources, userId }) => {
			try {
				if (userId)
					return dataSources.commonAPI.getSaveState(id, "comment", userId)

				return "unsave"
			} catch (error) {
				throw new GenericError("saveState", error)
			}
		},
	},
}

module.exports = {
	commentSchema: typeDefs,
	commentResolvers: resolvers,
}
