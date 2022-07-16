const { gql } = require("apollo-server")

const typeDefs = gql`
	type Query {
		"Query to get news array for the home page"
		newsForHome(offsetIndex: Int): [News!]!
		newsForRedditHome(offsetIndex: Int): [News!]!
		newsForProfile(offsetIndex: Int, id: ID!): [News!]
		news(id: ID!): News!
		author(id: ID!, reqId: ID!): Author!
		search(search: String!, filter: String!): [SearchResult!]
	}

	type Mutation {
		createNews(newsData: NewsInput!): CreateNewsResponse!
		updateNews(newsData: NewsInput!, id: ID!): UpdateNewsResponse!
	}

	input NewsInput {
		title: String!
		thumbnail: String!
		sources: String!
		tags: String!
		body: String!
	}

	type CreateNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"The id of the news that has been created"
		id: ID!
	}

	type UpdateNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"Updated news after a successful mutation"
		news: News
	}

	"This is the structure of a news"
	type News {
		id: ID!
		"The news' title"
		title: String!
		"The creator of the news"
		author: AuthorShort!
		"The picture to display in the home page or the news page"
		thumbnail: String
		"The subreddit the news originates from prefixed with r/"
		subreddit: String
		"The source of the news"
		sources: String!
		"The tags of the news, that help for better searching"
		tags: String
		"The body of the news"
		body: String
		"The type of the news: either 'reddit'(if it's from reddit) or 'created'(if it's from news-site)"
		type: String!
		"The creation date of the news"
		createdAt: String!
		"The last time the news was edited"
		updatedAt: String!
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
		"The number of news written by author"
		writtenNews: Int!
		"The number of followers of the author"
		followers: Int!
		"The date the account has been created"
		createdAt: String!
		"Specifies if the author is being followed by the user"
		following: Boolean
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

module.exports = typeDefs
