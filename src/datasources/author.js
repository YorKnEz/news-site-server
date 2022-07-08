const { DataSource } = require("apollo-datasource")
const { User } = require("../database")
const { getFunctionName } = require("../utils")

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
			console.error(`Error in ${getFunctionName()}: ${error}`)

			return error
		}
	}
}

module.exports = UserAPI
