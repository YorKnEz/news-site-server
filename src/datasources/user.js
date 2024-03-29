const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const fs = require("fs")

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

			return Promise.all(
				authorIds.map(async ({ authorId }) => {
					const author = await User.findOne({
						where: { id: authorId },
					})

					return author
				})
			)
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

	async updateProfile(userData) {
		try {
			// find the user of which to update the profile
			const user = await User.findOne({
				where: { id: userData.id },
			})

			if (!user) throw new UserInputError("Invalid input")

			const updateObject = {
				firstName: userData.firstName,
				lastName: userData.lastName,
				fullName: userData.firstName + " " + userData.lastName,
			}

			// if the profile picture has been updated, we need to delete the old one
			if (
				userData.profilePicture &&
				userData.profilePicture !== user.profilePicture
			) {
				fs.unlink(`./public/${user.profilePicture}`, err => {
					if (err) console.log(err)
				})

				updateObject.profilePicture = userData.profilePicture
			}

			// update the user data
			await user.update(updateObject)

			// save changes
			await user.save()

			return {
				message: "Updated successfully.",
				user,
			}
		} catch (error) {
			throw new GenericError("updateProfile", error)
		}
	}
}

module.exports = UserAPI
