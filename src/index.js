// start dotenv
require("dotenv").config()

const { ApolloServer } = require("apollo-server")
const typeDefs = require("./schema")
const resolvers = require("./resolvers")
const { RedditAPI, NewsAPI, UserAPI } = require("./datasources")
const { startAuthServer } = require("./express-server")

// check connection to database
const { testConnection } = require("./database/sequelize")
testConnection()

async function startApolloServer() {
	const server = new ApolloServer({
		typeDefs,
		resolvers,
		dataSources: () => {
			return {
				redditAPI: new RedditAPI(),
				newsAPI: new NewsAPI(),
				userAPI: new UserAPI(),
			}
		},
		context: ({ req }) => {
			// get the user token from the headers
			const token = req.headers.authorization || ""

			// try to retrieve an user with the token
			// const user = getUser(token)

			console.log(token)

			// add the user to the context
			// return { user }
			return true
		},
	})

	const port = process.env.APOLLO_SERVER_PORT

	const { url } = await server.listen(port)
	console.log(`
    🚀  Apollo Server is running
    🔉  Listening on port ${port}
    📭  Query at ${url}
  `)
}

startApolloServer()
startAuthServer()
