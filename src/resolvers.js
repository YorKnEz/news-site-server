const { getFunctionName, evaluateImageLink } = require("./utils")

// this is the variable used to get the next news from the reddit api
let after = ""

const resolvers = {
	Query: {
		// returns an array of news created on the site that will be used to populate the homepage
		newsForHome: async (_, { offsetIndex }, { dataSources }) => {
			try {
				const news = await dataSources.newsAPI.getNews(offsetIndex, "created")

				return news
			} catch (error) {
				console.error(`Error in ${getFunctionName()}: ${error}`)

				return error
			}
		},
		// returns an array of news created on the site that will be used to populate the homepage
		newsForRedditHome: async (_, { offsetIndex }, { dataSources }) => {
			try {
				const newsCount = await dataSources.newsAPI.getRedditNewsCount()

				// first check if there are 20 news available at the current offset
				if (newsCount < (offsetIndex + 1) * 20) {
					// if not, we fetch 20 news from reddit
					const { newAfter, fetchedNews } =
						await dataSources.redditAPI.getNewsFromUkrainianConflict(after)

					// update after variable with the next value from the reddit api
					after = newAfter

					const response2 = await dataSources.newsAPI.addNewsFromReddit(
						fetchedNews
					)
				}

				const news = await dataSources.newsAPI.getNews(offsetIndex, "reddit")

				return news
			} catch (error) {
				console.error(`Error in ${getFunctionName()}: ${error}`)

				return error
			}
		},
		news: async (_, { id }, { dataSources }) => {
			try {
				const news = await dataSources.newsAPI.getNewsById(id)

				return news
			} catch (error) {
				console.error(`Error in ${getFunctionName()}: ${error}`)

				return error
			}
		},
	},
	News: {
		author: async ({ authorId, type }, _, { dataSources }) => {
			try {
				let returnData

				// available types: "reddit", "created"
				switch (type) {
					case "reddit":
						// author info
						const { data } = await dataSources.redditAPI.getAuthorById(authorId)

						returnData = {
							id: data.id,
							fullName: data.name,
							// profilePicture: data.snoovatar_img
							// 	? data.snoovatar_img
							// 	: data.icon_img,
							profilePicture: data.icon_img
								? evaluateImageLink(data.icon_img)
								: evaluateImageLink(data.snoovatar_img),
						}

						break
					case "created":
						const author = await dataSources.userAPI.getAuthorById(authorId)

						returnData = {
							id: author.id,
							fullName: author.fullName,
							profilePicture: author.profilePicture,
							// profilePicture: data.icon_img
							// 	? evaluateImageLink(data.icon_img)
							// 	: evaluateImageLink(data.snoovatar_img),
						}

						break
				}

				return returnData
			} catch (error) {
				console.error(`Error in ${getFunctionName()}: ${error}`)

				return error
			}
		},
	},
}

module.exports = resolvers
