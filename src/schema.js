const { gql } = require("apollo-server")

const typeDefs = gql`
	type Query {
		"Query to get news array for the home page"
		newsForHome(offsetIndex: Int): [News!]!
		"Query to get reddit news array for the home page"
		newsForHomeReddit(after: String): NewsForHomeRedditResponse!
		"Gets all the news of a specific author"
		newsForProfile(offsetIndex: Int, id: ID!): [News!]
		"Gets a news by id"
		news(id: ID!): News!
		"Gets author info about an author"
		author(id: ID!): Author!
		"Gets all matching authors or news matching a search string"
		search(search: String!, filter: String!): [SearchResult!]
		"Gets all the followed authors of a user"
		followedAuthors(offsetIndex: Int): [Author!]
		"Gets the liked news by a user"
		likedNews(offsetIndex: Int): [News!]
	}

	type Mutation {
		"Creates a news based on input"
		createNews(newsData: NewsInput!): CreateNewsResponse!
		"Updates existing news in the db based on input"
		updateNews(newsData: NewsInput!, id: ID!): UpdateNewsResponse!
		"Deletes a news by id"
		deleteNews(id: ID!): DeleteNewsResponse!
		"Toggle like or dislike news. Action can be either 'like' or 'dislike'"
		voteNews(action: String!, id: ID!): VoteNewsResponse!
	}

	input NewsInput {
		title: String!
		thumbnail: String
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
	}

	type DeleteNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
	}

	type VoteNewsResponse {
		"Similar to HTTP status code, represents the status of the mutation"
		code: Int!
		"Indicated whether the mutation was successful"
		success: Boolean!
		"Human-readable message for the UI"
		message: String!
		"Updated number of likes"
		likes: Int!
		"Updated number of dislikes"
		dislikes: Int!
	}

	type NewsForHomeRedditResponse {
		after: String
		news: [News!]
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
		"Wether the user already liked or disliked the news. Can be 'like', 'dislike' or 'none'"
		voteState: String!
		"The number of likes the post has"
		likes: Int!
		"The number of dislikes the post has"
		dislikes: Int!
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
