const { RESTDataSource } = require("apollo-datasource-rest")

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
			console.error(`Error in getNewsFromRomania: ${error}`)
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
			console.error(`Error in getNewsFromNews: ${error}`)
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
			console.error(`Error in getNewsFromUkrainianConflict: ${error}`)
		}
	}

	async getAuthorById(authorId) {
		try {
			return this.get(`user/${authorId}/about.json`)
		} catch (error) {
			console.error(`Error in getAuthorById: ${error}`)
		}
	}
}

module.exports = RedditAPI
