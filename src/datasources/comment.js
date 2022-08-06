const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const { Op } = require("sequelize")

const { Comment, News, UserVote } = require("../database")
const { handleError } = require("../utils")

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
			const options = {}

			if (oldestComm) {
				options.createdAt = { [Op.lte]: oldestComm.createdAt }
				options.id = { [Op.lt]: oldestId }
			}

			options.parentId = parentId
			options.parentType = parentType

			// get the news
			const comments = await Comment.findAll({
				limit: dataToFetch,
				where: options,
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			return comments
		} catch (error) {
			return handleError("getCommentsByDate", error)
		}
	}

	async getCommentsByScore(oldestId, parentId, parentType, dataToFetch) {
		try {
			console.log(oldestId, parentId, parentType, dataToFetch)

			// find the oldest comment
			const oldestComm = await Comment.findOne({
				where: { id: oldestId },
			})

			// add the additional options if there is an oldest comment
			let options = {}

			if (oldestComm) {
				options.score = { [Op.eq]: oldestComm.score }
				options.createdAt = { [Op.lte]: oldestComm.createdAt }
				options.id = { [Op.not]: oldestComm.id }
			}

			options.parentId = parentId
			options.parentType = parentType

			const comments = await Comment.findAll({
				limit: dataToFetch,
				where: options,
				order: [
					["score", "DESC"],
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			if (comments.length < dataToFetch) {
				const dataToFetch2 = dataToFetch - comments.length

				options = {}

				if (oldestComm) {
					options.score = { [Op.lt]: oldestComm.score }
				}

				options.parentId = parentId
				options.parentType = parentType

				const comments2 = await Comment.findAll({
					limit: dataToFetch2,
					where: options,
					order: [
						["score", "DESC"],
						["createdAt", "DESC"],
						["id", "DESC"],
					],
				})

				comments.forEach(c =>
					console.log(c.id, c.score, c.createdAt, c.parentType)
				)
				comments2.forEach(c =>
					console.log(c.id, c.score, c.createdAt, c.parentType)
				)

				return [...comments, ...comments2]
			}

			comments.forEach(c =>
				console.log(c.id, c.score, c.createdAt, c.parentType)
			)

			return comments
		} catch (error) {
			return handleError("getCommentsByScore", error)
		}
	}

	async addComment(commentData, userId) {
		try {
			// if the parent of the comment is a news, we need to increase the comments counter
			if (commentData.parentType === "news") {
				// get the news
				const news = await News.findOne({
					where: { id: commentData.parentId },
				})

				// update the comment counter
				await news.update({ comments: news.comments + 1 })

				// save the changes
				await news.save()
			}
			// if the parent of the comment is a comment, we need to incresea the replies counter
			else if (commentData.parentType === "comment") {
				// get the comment
				const parentComment = await Comment.findOne({
					where: { id: commentData.parentId },
				})

				// update the replies counter
				await parentComment.update({ replies: parentComment.replies + 1 })

				// save the changes
				await parentComment.save()
			}

			// create the comment
			const comment = await Comment.create({
				UserId: userId,
				...commentData,
			})

			return comment
		} catch (error) {
			return handleError("addComment", error)
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
			return handleError("editComment", error)
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
			return handleError("removeComment", error)
		}
	}

	// update the replies counter of the comment
	async updateRepliesCounter(action, commentId) {
		try {
			// get the news
			const comment = await Comment.findOne({
				where: { id: commentId },
			})

			// if the news is not found, throw an error
			if (!comment) throw new UserInputError("Invalid input.")

			if (action === "up")
				await comment.update({ replies: comment.replies + 1 })

			if (action === "down")
				await comment.update({ replies: comment.replies - 1 })

			await comment.save()

			return comment.replies
		} catch (error) {
			return handleError("updateRepliesCounter", error)
		}
	}
}

module.exports = CommentAPI
