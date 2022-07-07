const { UserJWT } = require("../../database")

exports.checkJWT = async (req, res, next) => {
	console.log("Request URL: ", req.originalUrl)

	const userJWT = await UserJWT.findOne({
		where: { jwt: req.headers.authorization || "" },
	})

	if (!userJWT) {
		next({
			status: 403,
			message: "Unauthorized.",
		})
	}

	res.locals.userId = userJWT.UserId

	next()
}

exports.errorHandler = (err, req, res, next) => {
	if (err.status && err.message) {
		console.error(`Error: ${err.status} ${err.message}`)

		res.status(err.status).json({ error: err.message })
	} else {
		console.error(`Error: 400 ${err}`)

		res.status(400).json({ error: err })
	}
}

exports.replaceFileText = (text, items, args) => {
	items.forEach(item => {
		text = text.replace(item, args[item.slice(2, -1)])
	})
	return text
}
