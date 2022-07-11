// function that returns the name of the function that calls it
function getFunctionName() {
	return getFunctionName.caller.name
}

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

module.exports = {
	getFunctionName,
	evaluateImageLink,
	formatTitle,
}
