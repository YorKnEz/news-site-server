const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const { Op } = require("sequelize")

const { Comment, News, UserVote } = require("../database")
const comment = require("../schema/comment")
const { handleError } = require("../utils")

class CommentAPI extends DataSource {
	constructor() {
		super()
	}

	// gets the comments of news or other comments
	async getComments(offsetIndex, userId, parentId, parentType, dataToFetch) {
		try {
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

	async voteComment(action, commentId, userId) {
		try {
			/*
				propName - if the user wants to like the comment, we update propName of comment
				propName2 - if the user wants to like the comment, but he already disliked it, we update propName and propName2 of comment
				message1 - message to display if the user removed the like successfully
				message2 - message to display if the user liked the news successfully
			*/
			const options = {
				like: {
					propName: "likes",
					propName2: "dislikes",
					message1: "Comment like removed",
					message2: "Comment liked",
				},
				dislike: {
					propName: "dislikes",
					propName2: "likes",
					message1: "Comment dislike removed",
					message2: "Comment disliked",
				},
			}

			// first check if the comment exists
			const comment = await Comment.findOne({ where: { id: commentId } })

			// if the comment doesn't exist, throw an error
			if (!comment) throw new UserInputError("Invalid id.")

			// try to find if the user already liked the comment
			const link1 = await UserVote.findOne({
				where: {
					parentId: commentId,
					parentType: "comment",
					UserId: userId,
					type: action,
				},
			})

			// if he already liked the comment, remove the like
			if (link1) {
				// remove the link
				await link1.destroy()

				// update likes counter
				await comment.update({
					[options[action].propName]: comment[options[action].propName] - 1,
				})

				// save changes
				await comment.save()

				// return message
				return {
					message: options[action].message1,
					likes: comment.likes,
					dislikes: comment.dislikes,
				}
			}

			// try to find if the user disliked the comment
			const link2 = await UserVote.findOne({
				where: {
					parentId: commentId,
					parentType: "comment",
					UserId: userId,
					type: action === "like" ? "dislike" : "like",
				},
			})

			// if he already disliked the comment, remove the dislike in order to add the like
			if (link2) {
				// remove the link
				link2.destroy()

				// update dislikes counter
				await comment.update({
					[options[action].propName2]: comment[options[action].propName2] - 1,
				})

				// save changes
				await comment.save()
			}

			// create the link between the user and the comment
			await UserVote.create({
				UserId: userId,
				parentId: commentId,
				parentType: "comment",
				type: action,
			})

			// update likes counter
			await comment.update({
				[options[action].propName]: comment[options[action].propName] + 1,
			})

			// save changes
			await comment.save()

			return {
				message: options[action].message2,
				likes: comment.likes,
				dislikes: comment.dislikes,
			}
		} catch (error) {
			return handleError("voteComment", error)
		}
	}
}

module.exports = CommentAPI
