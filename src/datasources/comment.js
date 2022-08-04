const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const { Op } = require("sequelize")

const { Comment, News, UserVote, UserSave } = require("../database")
const comment = require("../schema/comment")
const { handleError } = require("../utils")

class CommentAPI extends DataSource {
	constructor() {
		super()
	}

	// gets the comments of news or other comments
	async getComments(oldestCommentDate, parentId, parentType, dataToFetch) {
		try {
			// get the comments
			const comments = await Comment.findAll({
				limit: dataToFetch,
				where: {
					parentId,
					parentType,
					createdAt: {
						[Op.lt]: new Date(parseInt(oldestCommentDate)).getTime(),
					},
				},
				order: [
					["createdAt", "DESC"],
					["id", "DESC"],
				],
			})

			return comments
		} catch (error) {
			return handleError("getComments", error)
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
					UserId: userId,
					parentId: commentData.parentId,
					parentType: commentData.parentType,
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

	async saveComment(action, commentId, userId) {
		try {
			// try to find if the comment has already been saved
			const link = await UserSave.findOne({
				where: {
					parentId: commentId,
					parentType: "comment",
					UserId: userId,
				},
			})

			// if the comment hasn't been saved but the action is "save", save it
			if (!link && action === "save") {
				await UserSave.create({
					parentId: commentId,
					parentType: "comment",
					UserId: userId,
				})

				return {
					code: 200,
					success: true,
					message: "Comment saved successfully",
				}
			}

			if (link && action === "unsave") {
				await link.destroy()

				return {
					code: 200,
					success: true,
					message: "Comment unsaved successfully",
				}
			}

			return {
				code: 400,
				success: false,
				message: "Invalid action",
			}
		} catch (error) {
			return handleError("saveComment", error)
		}
	}
}

module.exports = CommentAPI
