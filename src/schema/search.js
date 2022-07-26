const { gql } = require("apollo-server")

const typeDefs = gql`
	type Query {
		"Gets all matching authors or news matching a search string"
		search(search: String!, filter: String!): [SearchResult!]
	}

	type SearchResult {
		"How much the news matches the searching query"
		matches: Int
		"The news Object. Required if the filter type is title, body or tags"
		news: News
		"The authors Object. Required if the filter type is author"
		author: Author
	}
`

const resolvers = {
	Query: {
		search: async (_, { search, filter }, { dataSources, token }) => {
			try {
				if (!token)
					throw new AuthenticationError("You must be authenticated to do this.")

				switch (filter) {
					case "title":
						const newsTitle = await dataSources.newsAPI.searchNewsByTitle(
							search
						)

						return newsTitle
					case "body":
						const newsBody = await dataSources.newsAPI.searchNewsByBody(search)

						return newsBody
					case "author":
						const authors = await dataSources.userAPI.searchAuthors(search)

						return authors
					case "tags":
						const newsTags = await dataSources.newsAPI.searchNewsByTags(search)

						return newsTags
				}
			} catch (error) {
				return handleError("search", error)
			}
		},
	},
}

module.exports = {
	searchSchema: typeDefs,
	searchResolvers: resolvers,
}
