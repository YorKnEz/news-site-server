const { RESTDataSource } = require("apollo-datasource-rest")

class RedditAPI extends RESTDataSource {
	constructor() {
		super()
		this.baseURL = "https://www.reddit.com/"
	}

	// fetch news from r/news
	async getNewsFromNews() {
		try {
			// fetch 20 news
			const response = await this.get(`r/news/new.json?limit=2&after=${after}`)

			return {
				newAfter: response.data.after,
				fetchedNews: response.data.children,
			}
		} catch (error) {
			console.error(`Error in ${getFunctionName()}: ${error}`)
		}
	}

	// fetch news from r/UkrainianConflict
	async getNewsFromUkrainianConflict(after = "") {
		try {
			// fetch 20 news
			const response = await this.get(
				`r/UkrainianConflict/new.json?limit=2&after=${after}`
			)

			return {
				newAfter: response.data.after,
				fetchedNews: response.data.children,
			}
		} catch (error) {
			console.error(`Error in ${getFunctionName()}: ${error}`)
		}
	}

	async getAuthorById(authorId) {
		try {
			return this.get(`user/${authorId}/about.json`)
		} catch (error) {
			console.error(`Error in ${getFunctionName()}: ${error}`)
		}
	}
}

module.exports = RedditAPI
