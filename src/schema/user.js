const { gql, AuthenticationError, UserInputError } = require("apollo-server")

const { dataToFetch, handleError, handleMutationError } = require("../utils")

const typeDefs = gql`
	type Query {
		"Gets author info about an author"
		author(id: ID!): Author!
		"Gets all the followed authors of a user"
		followedAuthors(offsetIndex: Int): [Author!]
	}

	"Author data to be displayed on a news card"
	type AuthorShort {
		id: ID!
		"The name of the author"
		fullName: String!
		"The profile picture of the author"
		profilePicture: String
	}

	"Complete author data"
	type Author {
		id: ID!
		"The first name of the author"
		firstName: String!
		"The last name of the author"
		lastName: String!
		"The full name of the author"
		fullName: String!
		"EMail of the author"
		email: String!
		"Profile picture of the author"
		profilePicture: String
		"The type of the user, can be either user or author"
		type: String!
		"The number of news written by author"
		writtenNews: Int!
		"The number of followers of the author"
		followers: Int!
		"The date the account has been created"
		createdAt: String!
		"Specifies if the author is being followed by the user"
		following: Boolean
	}
`

const resolvers = {
	Query: {
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

module.exports = {
	userSchema: typeDefs,
	userResolvers: resolvers,
}
