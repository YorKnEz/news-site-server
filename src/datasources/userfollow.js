const { DataSource } = require("apollo-datasource")
const { UserFollow } = require("../database")
const { handleError } = require("../utils")

class UserFollowAPI extends DataSource {
	constructor() {
		super()
	}

	// retrieve the author with the id authorId
	async isFollowing(authorId, UserId) {
		try {
			const link = await UserFollow.findOne({
				where: {
					UserId,
					authorId,
				},
			})

			if (link) return true

			return false
		} catch (error) {
			handleError("isFollowing", error)
		}
	}
}

module.exports = UserFollowAPI
