const { DataSource } = require("apollo-datasource")
const { Op } = require("sequelize")

const { User, UserFollow } = require("../database")
const { GenericError } = require("../utils")

class UserAPI extends DataSource {
	constructor() {
		super()
	}

	// retrieve the author with the id authorId
	async getAuthorById(authorId) {
		try {
			const author = await User.findOne({
				where: {
					id: authorId,
					type: "author",
				},
			})

			if (!author) {
				throw {
					status: 404,
					message: "Author not found.",
				}
			}

			return author
		} catch (error) {
			throw new GenericError("getAuthorById", error)
		}
	}

	async getUserById(userId) {
		try {
			const user = await User.findOne({
				where: {
					id: userId,
				},
			})

			if (!user) {
				throw {
					status: 404,
					message: "User not found.",
				}
			}

			return user
		} catch (error) {
			throw new GenericError("getAuthorById", error)
		}
	}

	async searchAuthors(name) {
		try {
			// find the author whose first, last or full name is matching search query
			const authors = await User.findAll({
				where: {
					[Op.or]: [
						{ fullName: name },
						{ firstname: name },
						{ lastName: name },
					],
					type: "author",
				},
			})

			return authors.map(author => ({
				result: author,
			}))
		} catch (error) {
			throw new GenericError("searchAuthors", error)
		}
	}

	async getFollowedAuthors(offset, userId, dataToFetch) {
		try {
			const authorIds = await UserFollow.findAll({
				offset,
				limit: dataToFetch,
				where: {
					UserId: userId,
				},
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
				attributes: ["authorId"],
			})

			const authors = await Promise.all(
				authorIds.map(async ({ authorId }) => {
					const author = await User.findOne({
						where: { id: authorId },
					})

					return author.toJSON()
				})
			)

			return authors
		} catch (error) {
			throw new GenericError("getFollowedAuthors", error)
		}
	}
}

module.exports = UserAPI
