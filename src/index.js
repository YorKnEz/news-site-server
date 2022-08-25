// start dotenv
require("dotenv").config()

const { ApolloServer, AuthenticationError } = require("apollo-server")
const axios = require("axios")

const {
	CommentAPI,
	NewsAPI,
	RedditAPI,
	UserAPI,
	UserFollowAPI,
	CommonAPI,
} = require("./datasources")
const { testConnection } = require("./database/sequelize")
const { startExpressServer } = require("./express-server")
const { typeDefs, resolvers } = require("./schema")

const authIp = process.env.EXPRESS_SERVER_IP

// check connection to database
testConnection()

async function startApolloServer() {
	const server = new ApolloServer({
		typeDefs,
		resolvers,
		dataSources: () => {
			return {
				commentAPI: new CommentAPI(),
				commonAPI: new CommonAPI(),
				newsAPI: new NewsAPI(),
				redditAPI: new RedditAPI(),
				userAPI: new UserAPI(),
				userfollowAPI: new UserFollowAPI(),
			}
		},
		context: async ({ req }) => {
			try {
				// get the user token from the headers
				const token = req.headers.authorization
				console.log(token)

				if (token) {
					const { data } = await axios({
						method: "get",
						url: `${authIp}/users/login?token=${token}`,
					})

					// add the token to the context
					return {
						token,
						userId: data.user.id,
						userRole: data.user.type,
						verified: data.user.verified,
					}
				}
			} catch (error) {
				return
			}
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
startExpressServer()
