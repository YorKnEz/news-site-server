// start dotenv
require("dotenv").config()

const { ApolloServer, AuthenticationError } = require("apollo-server")
const axios = require("axios")

const { RedditAPI, NewsAPI, UserAPI, UserFollowAPI } = require("./datasources")
const { testConnection } = require("./database/sequelize")
const { startExpressServer } = require("./express-server")
const resolvers = require("./resolvers")
const typeDefs = require("./schema")

const authIp = process.env.EXPRESS_SERVER_IP

// check connection to database
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
				userfollowAPI: new UserFollowAPI(),
			}
		},
		context: async ({ req }) => {
			// get the user token from the headers
			const reqToken = req.headers.authorization

			// if the token doesn't exist the value of reqToken will be "null" so we take that into account when getting the token
			const token = reqToken && reqToken !== "null" ? reqToken : ""

			if (token) {
				const { data } = await axios({
					method: "get",
					url: `${authIp}/users/login`,
					data: {
						token,
					},
				}).catch(error => {
					throw new AuthenticationError(error.message)
				})

				// add the token to the context
				return {
					userId: data.user.id,
					userRole: data.user.type,
					token,
				}
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
