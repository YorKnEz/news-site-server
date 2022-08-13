const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
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
			throw new GenericError("getUserById", error)
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

	async getBestAuthors() {
		try {
			// find the top five best authors
			return User.findAll({
				limit: 5,
				where: {
					type: "author",
				},
				order: [
					["followers", "DESC"],
					["writtenNews", "DESC"],
					["id", "DESC"],
				],
			})
		} catch (error) {
			throw new GenericError("getBestAuthors", error)
		}
	}

	// follow or unfollow a user
	async follow(action, authorId, userId) {
		try {
			const author = await User.findOne({
				where: {
					id: authorId,
				},
			})

			if (!author)
				throw new UserInputError("The author you want to follow doesn't exist")

			if (author.type === "user")
				throw new UserInputError("You can't follow regular users")

			// find if the author has been already followed
			const link = await UserFollow.findOne({
				where: {
					UserId: userId,
					authorId,
				},
			})

			if (action === "follow" && link)
				throw new UserInputError("You already follow this author")

			if (action === "unfollow" && !link)
				throw new UserInputError("You don't follow this author")

			if (action === "follow" && !link) {
				// create the follow link
				await UserFollow.create({
					UserId: userId,
					authorId,
				})
			}

			if (action === "unfollow" && link) {
				// destroy the follow link
				await link.destroy()
			}

			// update the author's followers
			await author.update({
				followers: author.followers + (action === "follow" ? 1 : -1),
			})

			// save the changes
			await author.save()

			return `Author ${action}ed successfully`
		} catch (error) {
			throw new GenericError("follow", error)
		}
	}
}

module.exports = UserAPI
