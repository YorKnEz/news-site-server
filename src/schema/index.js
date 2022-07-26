const { gql } = require("apollo-server")
const { merge } = require("lodash")

const { commentSchema, commentResolvers } = require("./comment")
const { newsSchema, newsResolvers } = require("./news")
const { searchSchema, searchResolvers } = require("./search")
const { userSchema, userResolvers } = require("./user")

const typeDefs = [commentSchema, newsSchema, searchSchema, userSchema]

const resolvers = merge(
	commentResolvers,
	newsResolvers,
	searchResolvers,
	userResolvers
)

module.exports = {
	typeDefs,
	resolvers,
}
