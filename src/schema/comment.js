const { gql, AuthenticationError, ForbiddenError } = require("apollo-server")

const { dataToFetch, handleError, handleMutationError } = require("../utils")

const typeDefs = gql`
	type Query {
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
	},
	Mutation: {
	},
	Comment: {
	},
}

module.exports = {
	commentSchema: typeDefs,
	commentResolvers: resolvers,
}
