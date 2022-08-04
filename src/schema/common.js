const {
	gql,
	AuthenticationError,
	ForbiddenError,
	UserInputError,
} = require("apollo-server")

const { dataToFetch, handleError, handleMutationError } = require("../utils")

const typeDefs = gql`
`

const resolvers = {
}

module.exports = {
	commonSchema: typeDefs,
	commonResolvers: resolvers,
}
