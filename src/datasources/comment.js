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
			if (commentData.type === "news") {
				// get the news
				const news = await News.findOne({
					where: { id: commentData.parentId },
				})

				// update the comment counter
				await news.update({ comments: news.comments + 1 })

				// save the changes
				await news.save()
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
}

module.exports = CommentAPI
