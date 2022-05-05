// function that return the name of the function that calls it
function getFunctionName() {
	return getFunctionName.caller.name
}

// function that modifies a string in order to have maximum 100 characters
function getTitle(string) {
	if (string.length > 100) {
		const substring = string.substring(0, 96)

		const lastSpaceIndex = substring.lastIndexOf(" ")

		return string.substring(0, lastSpaceIndex) + "..."
	}

	return string
}

// removes the query parameters from a image link or returns "default"
function evaluateImageLink(link) {
	const isJPG = link.indexOf(".jpg")

	if (isJPG > 0) return link.substring(0, isJPG + 4)

	const isJPEG = link.indexOf(".jpeg")

	if (isJPEG > 0) return link.substring(0, isJPEG + 5)

	const isPNG = link.indexOf(".png")

	if (isPNG > 0) return link.substring(0, isPNG + 4)

	return "../public/default_avatar.png"
}

module.exports = {
	getFunctionName,
	getTitle,
	evaluateImageLink,
}
