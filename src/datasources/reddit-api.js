const { RESTDataSource } = require("apollo-datasource-rest")
const { handleError } = require("../utils")

class RedditAPI extends RESTDataSource {
	constructor() {
		super()
		this.baseURL = "https://www.reddit.com/"
	}

	// fetch news from r/Romania
	async getNewsFromRomania(after = "") {
		try {
			// fetch 20 news
			const response = await this.get(
				`r/Romania/new.json?link_flair_text="Știri"&limit=20&after=${after}`
			)

			return {
				newAfter: response.data.after,
				fetchedNews: response.data.children,
			}
		} catch (error) {
			return handleError("getNewsFromRomania", error)
		}
	}

	// fetch news from r/news
	async getNewsFromNews(after = "") {
		try {
			// fetch 20 news
			const response = await this.get(`r/news/new.json?limit=20&after=${after}`)

			return {
				newAfter: response.data.after,
				fetchedNews: response.data.children,
			}
		} catch (error) {
			return handleError("getNewsFromNews", error)
		}
	}

	// fetch news from r/UkrainianConflict
	async getNewsFromUkrainianConflict(after = "") {
		try {
			// fetch 20 news
			const response = await this.get(
				`r/UkrainianConflict/new.json?limit=20&after=${after}`
			)

			return {
				newAfter: response.data.after,
				fetchedNews: response.data.children,
			}
		} catch (error) {
			return handleError("getNewsFromUkrainianConflict", error)
		}
	}

	async getAuthorById(authorId) {
		try {
			return this.get(`user/${authorId}/about.json`)
		} catch (error) {
			return handleError("getAuthorById", error)
		}
	}
}

module.exports = RedditAPI
