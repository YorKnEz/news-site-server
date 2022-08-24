const { gql } = require("apollo-server")
const { GenericError } = require("../utils")

const typeDefs = gql`
	union Result = NewsSearch | AuthorSearch

	type Query {
		"Gets all matching authors or news matching a search string"
		search(search: String!, filter: String!, fetchedResults: Int!): [Result!]
	}

	type NewsSearch {
		"How much the news matches the searching query"
		matches: Int
		"The search result."
		result: News
	}

	type AuthorSearch {
		"The search result."
		result: Author
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

				switch (filter) {
					case "title":
						return dataSources.newsAPI.searchNewsByTitle(search, fetchedResults)
					case "body":
						return dataSources.newsAPI.searchNewsByBody(search, fetchedResults)
					case "author":
						return dataSources.userAPI.searchAuthors(search, fetchedResults)
					case "tags":
						return dataSources.newsAPI.searchNewsByTags(search, fetchedResults)
				}
			} catch (error) {
				throw new GenericError("search", error)
			}
		},
	},
	Result: {
		__resolveType: async ({ result }) => {
			// only news have a title
			if (result?.title) return "NewsSearch"

			// only auhtors have a full name
			if (result?.fullName) return "AuthorSearch"

			// throw an error
			return null
		},
	},
}

module.exports = {
	searchSchema: typeDefs,
	searchResolvers: resolvers,
}
