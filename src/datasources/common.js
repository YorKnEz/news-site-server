const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const { Op } = require("sequelize")

const { Comment, News, UserVote, UserSave } = require("../database")
const { GenericError } = require("../utils")

class CommonAPI extends DataSource {
	constructor() {
		super()
	}

	// retrieve [dataToFetch] liked news based on an offset
	async getLiked(oldestId, oldestType, userId, dataToFetch) {
		try {
			// get the oldest fetched like link
			const oldestLike = await UserVote.findOne({
				where: {
					UserId: userId,
					parentId: oldestId,
					parentType: oldestType,
				},
			})

			// add the additional options if there is an oldest items
			const options = {}

			if (oldestLike) {
				options.createdAt = { [Op.lte]: oldestLike.createdAt }
				options.id = { [Op.lt]: oldestLike.id }
			}

			options.type = "like"
			options.UserId = userId

			// retrieve all the ids of the liked items
			const likedItemsIds = await UserVote.findAll({
				limit: dataToFetch,
				where: options,
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			// get all the items based on the ids
			const items = await Promise.all(
				likedItemsIds.map(async ({ parentId, parentType }) => {
					if (parentType === "news") {
						return News.findOne({ where: { id: parentId } })
					}

					if (parentType === "comment") {
						return {
							comment: await Comment.findOne({ where: { id: parentId } }),
						}
					}
				})
			)

			return items
		} catch (error) {
			throw new GenericError("getLiked", error)
		}
	}

	// vote a news or comment
	async vote(action, parentId, parentType, userId) {
		try {
			/*
				propName - if the user wants to like the parent, we update propName of parent
				propName2 - if the user wants to like the parent, but he already disliked it, we update propName and propName2 of parent
				message1 - message to display if the user removed the like successfully
				message2 - message to display if the user liked the news successfully
			*/
			const options = {
				like: {
					propName: "likes",
					propName2: "dislikes",
					message1: "Like removed",
					message2: "Like added",
				},
				dislike: {
					propName: "dislikes",
					propName2: "likes",
					message1: "Dislike removed",
					message2: "Dislike added",
				},
			}

			// first check if the parent exists
			let parent = undefined

			if (parentType === "comment")
				parent = await Comment.findOne({ where: { id: parentId } })

			if (parentType === "news")
				parent = await News.findOne({ where: { id: parentId } })

			// if the parent doesn't exist, throw an error
			if (!parent) throw new UserInputError("Invalid id.")

			// try to find if the user already liked the parent
			const link1 = await UserVote.findOne({
				where: {
					parentId,
					parentType,
					UserId: userId,
					type: action,
				},
			})

			// if he already liked the parent, remove the like
			if (link1) {
				// remove the link
				await link1.destroy()

				// update likes counter
				await parent.update({
					[options[action].propName]: parent[options[action].propName] - 1,
				})

				// save changes
				await parent.save()

				// update the score
				await parent.update({
					score: parent.likes - parent.dislikes,
				})

				await parent.save()

				// return message
				return {
					message: options[action].message1,
					score: parent.score,
				}
			}

			// try to find if the user disliked the parent
			const link2 = await UserVote.findOne({
				where: {
					parentId,
					parentType,
					UserId: userId,
					type: action === "like" ? "dislike" : "like",
				},
			})

			// if he already disliked the parent, remove the dislike in order to add the like
			if (link2) {
				// remove the link
				link2.destroy()

				// update dislikes counter
				await parent.update({
					[options[action].propName2]: parent[options[action].propName2] - 1,
				})

				// save changes
				await parent.save()
			}

			// create the link between the user and the parent
			await UserVote.create({
				UserId: userId,
				parentId,
				parentType,
				type: action,
			})

			// update likes counter
			await parent.update({
				[options[action].propName]: parent[options[action].propName] + 1,
			})

			// save changes
			await parent.save()

			// update the score
			await parent.update({
				score: parent.likes - parent.dislikes,
			})

			await parent.save()

			return {
				message: options[action].message2,
				score: parent.score,
			}
		} catch (error) {
			throw new GenericError("vote", error)
		}
	}

	async getVoteState(parentId, parentType, userId) {
		try {
			// find if the user liked or disliked the news
			const link = await UserVote.findOne({
				where: {
					UserId: userId,
					parentId,
					parentType,
					type: { [Op.or]: ["like", "dislike"] },
				},
			})

			if (!link) return "none"

			return link.type
		} catch (error) {
			throw new GenericError("getVoteState", error)
		}
	}

	// retrieve [dataToFetch] saved news based on an offset
	async getSaved(oldestId, oldestType, userId, dataToFetch) {
		try {
			// get the oldest fetched save link
			const oldestSave = await UserSave.findOne({
				where: {
					UserId: userId,
					parentId: oldestId,
					parentType: oldestType,
				},
			})

			// add the additional options if there is an oldest news
			const options = {}

			if (oldestSave) {
				options.createdAt = { [Op.lte]: oldestSave.createdAt }
				options.id = { [Op.lt]: oldestSave.id }
			}

			options.UserId = userId

			// retrieve all the ids of the liked news
			const savedItemsIds = await UserSave.findAll({
				limit: dataToFetch,
				where: options,
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			// get all the news based on the ids
			const items = await Promise.all(
				savedItemsIds.map(async ({ parentId, parentType }) => {
					if (parentType === "news") {
						return News.findOne({ where: { id: parentId } })
					}

					if (parentType === "comment") {
						return {
							comment: await Comment.findOne({ where: { id: parentId } }),
						}
					}
				})
			)

			return items
		} catch (error) {
			throw new GenericError("getSaved", error)
		}
	}

	// save a news or comment
	async save(action, parentId, parentType, userId) {
		try {
			// try to find if the parent has already been saved
			const link = await UserSave.findOne({
				where: {
					parentId,
					parentType,
					UserId: userId,
				},
			})

			// if the parent hasn't been saved but the action is "save", save it
			if (!link && action === "save") {
				await UserSave.create({
					parentId,
					parentType,
					UserId: userId,
				})

				return {
					code: 200,
					success: true,
					message: "Saved successfully",
				}
			}

			if (link && action === "unsave") {
				await link.destroy()

				return {
					code: 200,
					success: true,
					message: "Unsaved successfully",
				}
			}

			return {
				code: 400,
				success: false,
				message: "Invalid action",
			}
		} catch (error) {
			throw new GenericError("save", error)
		}
	}

	async getSaveState(parentId, parentType, userId) {
		try {
			// see if the
			const link = await UserSave.findOne({
				where: {
					parentId,
					parentType,
					UserId: userId,
				},
			})

			// if the link exists the state is saved
			if (link) return "save"

			// if not then the state is unsaved
			return "unsave"
		} catch (error) {
			throw new GenericError("getSaveState", error)
		}
	}
}

module.exports = CommonAPI
