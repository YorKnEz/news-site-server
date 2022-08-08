const { RESTDataSource } = require("apollo-datasource-rest")

const { GenericError } = require("../utils")

class RedditAPI extends RESTDataSource {
	constructor() {
		super()
		this.baseURL = "https://www.reddit.com/"
	}

	// fetch news from r/Romania
	async getNewsFromRomania(after = "", dataToFetch) {
		try {
			// fetch [dataToFetch] news
			const response = await this.get(
				`r/Romania/new.json?link_flair_text="Știri"&limit=${dataToFetch}&after=${after}`
			)

			return {
				newAfter: response.data.after,
				fetchedNews: response.data.children,
			}
		} catch (error) {
			throw new GenericError("getNewsFromRomania", error)
		}
	}

	// fetch news from r/news
	async getNewsFromNews(after = "", dataToFetch) {
		try {
			// fetch [dataToFetch] news
			const response = await this.get(
				`r/news/new.json?limit=${dataToFetch}&after=${after}`
			)

			return {
				newAfter: response.data.after,
				fetchedNews: response.data.children,
			}
		} catch (error) {
			throw new GenericError("getNewsFromNews", error)
		}
	}

	// fetch news from r/UkrainianConflict
	async getNewsFromUkrainianConflict(after = "", dataToFetch) {
		try {
			// fetch [dataToFetch] news
			const response = await this.get(
				`r/UkrainianConflict/new.json?limit=${dataToFetch}&after=${after}`
			)

			return {
				newAfter: response.data.after,
				fetchedNews: response.data.children,
			}
		} catch (error) {
			throw new GenericError("getNewsFromUkrainianConflict", error)
		}
	}

	async getAuthorById(authorId) {
		try {
			return this.get(`user/${authorId}/about.json`)
		} catch (error) {
			throw new GenericError("getAuthorById", error)
		}
	}
}

module.exports = RedditAPI
