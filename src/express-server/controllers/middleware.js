const { UserJWT, User } = require("../../database")

// check if the jwt of the user making the request is valid
exports.checkJWT = async (req, res, next) => {
	try {
		const userJWT = await UserJWT.findOne({
			where: { jwt: req.headers.authorization || "" },
		})

		if (!userJWT) {
			return next({
				status: 403,
				message: "Unauthorized.",
			})
		}

		res.locals.userId = userJWT.UserId

		next()
	} catch (e) {
		next(e)
	}
}

// check if the user that makes the request is an author
exports.checkAuthor = async (req, res, next) => {
	try {
		const user = await User.findOne({
			where: {
				id: res.locals.userId,
			},
		})

		if (!user) {
			return next({
				status: 403,
				message: "Unauthorized.",
			})
		}

		if (user.type !== "author") {
			return next({
				status: 403,
				message: "Unauthorized. Only authors can create news.",
			})
		}

		next()
	} catch (e) {
		next(e)
	}
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
