const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const { Op } = require("sequelize")

const { Comment, News } = require("../database")
const comment = require("../schema/comment")
const { handleError } = require("../utils")

class CommentAPI extends DataSource {
	constructor() {
		super()
	}

	// gets the comments of news or other comments
	async getComments(offsetIndex, userId, parentId, parentType, dataToFetch) {
		try {
			// if the user id is mentioned, we will show the user's comments first and then the others, sorted by date
			if (userId) {
				// get the comments of the user, sorted by date
				const userComments = await Comment.findAll({
					offset: offsetIndex * dataToFetch,
					limit: dataToFetch,
					where: {
						UserId: userId,
						parentId,
						parentType,
					},
					order: [["createdAt", "DESC"]],
				})

				// get the comments of other users, sorted by date
				const otherComments = await Comment.findAll({
					offset: offsetIndex * dataToFetch,
					limit: dataToFetch,
					where: {
						UserId: { [Op.not]: userId },
						parentId,
						parentType,
					},
					order: [["createdAt", "DESC"]],
				})

				// merge the two comments arrays, user's first, others second
				const comments = [...userComments, ...otherComments]

				// set the repliesOffsetIndex to be 0
				return comments.map(comment => ({ ...comment, repliesOffsetIndex: 0 }))
				// if the userId is not specified, return all comments sorted by date
			} else {
				// get the comments
				const comments = await Comment.findAll({
					offset: offsetIndex * dataToFetch,
					limit: dataToFetch,
					where: {
						parentId,
						parentType,
					},
					order: [["createdAt", "DESC"]],
				})

				// set the repliesOffsetIndex to be 0
				return comments.map(comment => ({ ...comment, repliesOffsetIndex: 0 }))
			}
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

	async editComment(commentData, userId) {
		try {
			// try to find the comment that the user wants to edit
			const comment = await Comment.findOne({
				where: {
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

			// if the parent of the comment is a news, the commments counter should be decreased
			if (comment.parentType === "news") {
				// find the news
				const news = await News.findOne({
					where: { id: comment.parentId },
				})

				// update the comment counter
				await news.update({ comments: news.comments - 1 })

				// save the changes
				await news.save()
			}
			// if the parent of the comment is a news, the commments counter should be decreased
			else if (comment.parentType === "comment") {
				// find the news
				const parentComment = await News.findOne({
					where: { id: comment.parentId },
				})

				// update the comment counter
				await parentComment.update({ replies: parentComment.replies - 1 })

				// save the changes
				await parentComment.save()
			}

			// remove the comment
			await comment.destroy()
		} catch (error) {
			return handleError("removeComment", error)
		}
	}
}

module.exports = CommentAPI
