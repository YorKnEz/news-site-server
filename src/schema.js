const { gql } = require("apollo-server")

const typeDefs = gql`
	type Query {
		"Query to get news array for the home page"
		newsForHome(offsetIndex: Int): [News!]!
		news(id: ID!): News!
	}

	"This is the structure of a news"
	type News {
		id: ID!
		"The news' title"
		title: String!
		"The creator of the news"
		author: Author!
		"The creation date of the news"
		date: String!
		"The picture to display in the home page or the news page"
		thumbnail: String
		"The subreddit the news originates from prefixed with r/"
		subreddit: String
		"The source of the news"
		source: String!
		"The body of the news"
		body: String
		"The type of the news: either 'reddit'(if it's from reddit) or 'created'(if it's from news-site"
		type: String!
	}

	"An author of a news"
	type Author {
		id: ID!
		"The name of the author"
		fullName: String!
		"The profile picture of the author"
		profilePicture: String
	}
`

module.exports = typeDefs