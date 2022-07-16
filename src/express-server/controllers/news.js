const { News, User } = require("../../database")

// required for saving images locally
const multer = require("multer")

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public")
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname)
	},
})

const upload = multer({ storage: storage }).single("file")

exports.uploadThumbnail = async (req, res, next) => {
	upload(req, res, err => {
		if (err) {
			return next({
				status: 500,
				message: err,
			})
		}
		res.status(200).json({
			message: "Successfully uploaded thumbnail.",
		})
	})
}

exports.create = async (req, res, next) => {
	try {
		const user = await User.findOne({
			where: {
				email: req.body.authorEmail,
			},
		})

		if (!user) {
			return next({
				status: 400,
				message: "Invalid email.",
			})
		}

		if (user.id !== res.locals.userId) {
			return next({
				status: 403,
				message: "Unauthorized",
			})
		}

		const news = await News.create({
			title: req.body.title,
			authorId: user.id,
			thumbnail: req.body.thumbnail,
			subreddit: "",
			sources: req.body.sources,
			tags: req.body.tags,
			body: req.body.body,
			type: "created",
		})

		await user.update({
			writtenNews: user.writtenNews + 1,
		})

		await user.save()

		res.status(200).json({
			message: "Created news successfully.",
			news,
		})
	} catch (e) {
		next(e)
	}
}

exports.edit = async (req, res, next) => {
	try {
		const user = await User.findOne({
			where: {
				email: req.body.authorEmail,
			},
		})

		if (!user) {
			return next({
				status: 400,
				message: "Invalid email.",
			})
		}

		if (res.locals.userId != user.id) {
			return next({
				status: 403,
				message: "Unauthorized.",
			})
		}

		const newsToEdit = await News.findOne({
			where: {
				id: req.body.id,
			},
		})

		if (!newsToEdit) {
			return next({
				status: 400,
				message: "Invalid id.",
			})
		}

		await newsToEdit.update({
			title: req.body.title,
			thumbnail: req.body.thumbnail,
			body: req.body.body,
			sources: req.body.sources,
			tags: req.body.tags,
		})

		await newsToEdit.save()

		res.status(200).json({
			message: "Updated news successfully.",
			newsToEdit,
		})
	} catch (e) {
		next(e)
	}
}

exports.delete = async (req, res, next) => {
	try {
		const user = await User.findOne({
			where: {
				id: req.body.author.id,
			},
		})

		if (!user) {
			return next({
				status: 404,
				message: "User not found.",
			})
		}

		if (res.locals.userId != user.id) {
			return next({
				status: 403,
				message: "Unauthorized.",
			})
		}

		const newsToDelete = await News.findOne({
			where: {
				id: req.body.id,
			},
		})

		if (!newsToDelete) {
			return next({
				status: 400,
				message: "Invalid id.",
			})
		}

		await newsToDelete.destroy()

		await user.update({
			writtenNews: user.writtenNews - 1,
		})

		await user.save()

		res.status(200).json({
			message: "Deleted news successfully.",
		})
	} catch (e) {
		next(e)
	}
}
