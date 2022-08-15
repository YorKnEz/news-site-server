const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const { Op } = require("sequelize")

const { Comment, News, UserVote } = require("../database")
const { GenericError } = require("../utils")

class CommentAPI extends DataSource {
	constructor() {
		super()
	}

	// gets the comments of news or other comments
	async getCommentsByDate(oldestId, parentId, parentType, dataToFetch) {
		try {
			// find the oldest comment
			const oldestComm = await Comment.findOne({
				where: { id: oldestId, parentId, parentType },
			})

			// add the additional options if there is an oldest news
			const options = {
				limit: dataToFetch,
				where: { parentId, parentType },
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			}

			if (oldestComm) {
				options.where.createdAt = { [Op.lte]: oldestComm.createdAt }
				options.where.id = { [Op.lt]: oldestId }
			}

			// get the news
			return Comment.findAll(options)
		} catch (error) {
			throw new GenericError("getCommentsByDate", error)
		}
	}

	async getCommentsByScore(oldestId, parentId, parentType, dataToFetch) {
		try {
			// find the oldest comment
			const oldestComm = await Comment.findOne({
				where: { id: oldestId },
			})

			// add the additional options if there is an oldest comment
			let options = {
				limit: dataToFetch,
				where: { parentId, parentType },
				order: [
					["score", "DESC"],
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			}

			if (oldestComm) {
				options.where.score = { [Op.eq]: oldestComm.score }
				options.where.createdAt = { [Op.lte]: oldestComm.createdAt }
				options.where.id = { [Op.not]: oldestComm.id }
			}

			const comments = await Comment.findAll(options)

			// if the max number of comments hasn't been fetch, try to fetch more
			if (oldestId && comments.length < dataToFetch) {
				options.limit = dataToFetch - comments.length
				options.where = { parentId, parentType }

				if (oldestComm) {
					options.where.score = { [Op.lt]: oldestComm.score }
				}

				const restOfComments = await Comment.findAll(options)

				return [...comments, ...restOfComments]
			}

			return comments
		} catch (error) {
			throw new GenericError("getCommentsByScore", error)
		}
	}

	async addComment(commentData, userId) {
		try {
			let item

			// find the parent to increase the replies counter of
			if (commentData.parentType === "news") {
				// get the news
				item = await News.findOne({
					where: { id: commentData.parentId },
				})
			} else if (commentData.parentType === "comment") {
				// get the comment
				item = await Comment.findOne({
					where: { id: commentData.parentId },
				})
			}

			// update the comment counter
			await item.update({ replies: item.replies + 1 })

			// save the changes
			await item.save()

			// create the comment
			const comment = await Comment.create({
				UserId: userId,
				...commentData,
			})

			return comment
		} catch (error) {
			throw new GenericError("addComment", error)
		}
	}

	async editComment(commentData, userId, commentId) {
		try {
			// try to find the comment that the user wants to edit
			const comment = await Comment.findOne({
				where: {
					id: commentId,
					newsId: commentData.newsId,
					parentId: commentData.parentId,
					parentType: commentData.parentType,
					UserId: userId,
				},
			})

			// if the comment is not found, throw an error
			if (!comment) throw new UserInputError("Invalid input.")

			// update the body of the comment
			await comment.update({ body: commentData.body })

			// save the changes
			await comment.save()

			// return the updated comment
			return comment
		} catch (error) {
			throw new GenericError("editComment", error)
		}
	}

	async removeComment(id, userId) {
		try {
			// find the comment of the user
			const comment = await Comment.findOne({
				where: {
					id,
					UserId: userId,
				},
			})

			// if the comment is not found, throw an error
			if (!comment) throw new UserInputError("Invalid input.")

			// in order to avoid complications, every deleted comment will have it's author replaced with [deleted] and the content of the comment with [deleted]
			await comment.update({
				body: "<p>[deleted]</p>",
			})

			// save changes
			await comment.save()

			// return the deleted comment
			return comment
		} catch (error) {
			throw new GenericError("removeComment", error)
		}
	}
}

module.exports = CommentAPI
