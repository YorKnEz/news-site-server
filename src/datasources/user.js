const { DataSource } = require("apollo-datasource")
const { Op } = require("sequelize")

const { User, UserFollow } = require("../database")
const { handleError } = require("../utils")

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
			return handleError("getAuthorById", error)
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
				author,
			}))
		} catch (error) {
			return handleError("searchAuthors", error)
		}
	}

	async getFollowedAuthors(offsetIndex, userId, dataToFetch) {
		try {
			const authorIds = await UserFollow.findAll({
				offset: offsetIndex * dataToFetch,
				limit: dataToFetch,
				where: {
					UserId: userId,
				},
				order: [["createdAt", "DESC"]],
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
			return handleError("getFollowedAuthors", error)
		}
	}
}

module.exports = UserAPI