const { gql } = require("apollo-server")
const { GenericError } = require("../utils")

const typeDefs = gql`
	type Query {
		"Gets all matching authors or news matching a search string"
		search(search: String!, filter: String!, fetchedResults: Int!): [News!]
	}
`

const resolvers = {
	Query: {
		search: async (
			_,
			{ search, filter, fetchedResults },
			{ dataSources, token }
		) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				return dataSources.newsAPI.searchNews(search, filter, fetchedResults)
			} catch (error) {
				throw new GenericError("search", error)
			}
		},
	},
}

module.exports = {
	searchSchema: typeDefs,
	searchResolvers: resolvers,
}
