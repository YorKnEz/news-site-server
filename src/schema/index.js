const { gql } = require("apollo-server")
const { merge } = require("lodash")

const { commentSchema, commentResolvers } = require("./comment")
const { commonSchema, commonResolvers } = require("./common")
const { newsSchema, newsResolvers } = require("./news")
const { searchSchema, searchResolvers } = require("./search")
const { userSchema, userResolvers } = require("./user")

const typeDefs = [
	commentSchema,
	commonSchema,
	newsSchema,
	searchSchema,
	userSchema,
]

const resolvers = merge(
	commentResolvers,
	commonResolvers,
	newsResolvers,
	searchResolvers,
	userResolvers
)

module.exports = {
	typeDefs,
	resolvers,
}
