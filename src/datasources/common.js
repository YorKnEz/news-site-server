const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const { Op } = require("sequelize")

const { Comment, News, UserVote, UserSave } = require("../database")
const { handleError } = require("../utils")

class CommonAPI extends DataSource {
	constructor() {
		super()
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

				// return message
				return {
					message: options[action].message1,
					likes: parent.likes,
					dislikes: parent.dislikes,
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

			return {
				message: options[action].message2,
				likes: parent.likes,
				dislikes: parent.dislikes,
			}
		} catch (error) {
			return handleError("vote", error)
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
			return handleError("save", error)
		}
	}
module.exports = CommonAPI
