const { ApolloError } = require("apollo-server")

// removes the query parameters from a image link or returns "default"
const evaluateImageLink = link => {
	const isJPG = link.indexOf(".jpg")

	if (isJPG > 0) return link.substring(0, isJPG + 4)

	const isJPEG = link.indexOf(".jpeg")

	if (isJPEG > 0) return link.substring(0, isJPEG + 5)

	const isPNG = link.indexOf(".png")

	if (isPNG > 0) return link.substring(0, isPNG + 4)

	return "../public/default_avatar.png"
}

const formatTitle = title => {
	if (title.length > 255) {
		const newTitle = title.slice(0, 252) + "..."

		return newTitle
	}

	return title
}

const handleError = (location, error) => {
	if (error.status && error.message) {
		console.log(`Error ${error.status} in ${location}: ${error.message}`)
	} else {
		console.log(`Error in ${location}: ${error}`)
	}

	return error
}

const handleMutationError = (location, error) => {
	if (error.status && error.message) {
		console.log(`Error ${error.status} in ${location}: ${error.message}`)

		return {
			code: error.status,
			success: false,
			message: error.message,
		}
	} else {
		console.log(`Error in ${location}: ${error}`)

		return {
			code: 400,
			success: false,
			message: error.message,
		}
	}
}

// used for resolvers that return arrays
const dataToFetch = 4

// custom error class
class GenericError extends ApolloError {
	constructor(location, error) {
		const message = error.message ? error.message : error

		super(message, 500)

		if (error.status && error.message) {
			console.log(`Error ${error.status} in ${location}: ${error.message}`)
		} else {
			console.log(`Error in ${location}: ${error}`)
		}

		Object.defineProperty(this, "name", { value: message })
	}
}

module.exports = {
	dataToFetch,
	evaluateImageLink,
	formatTitle,
	handleError,
	handleMutationError,
	GenericError,
}
