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

exports.create = async (req, res, next) => {
	try {
		const user = await User.findOne({
			where: {
				email: req.body.authorEmail,
			},
		})

		if (!user) {
			next({
				status: 400,
				message: "Invalid email.",
			})
		}

		const news = await News.create({
			title: req.body.title,
			authorId: user.id,
			date: req.body.date,
			thumbnail: req.body.thumbnail,
			subreddit: "",
			sources: req.body.sources,
			tags: req.body.tags,
			body: req.body.body,
			type: "created",
		})

		res.status(200).json({
			message: "Created news successfully.",
			news,
		})
	} catch (e) {
		next(e)
	}
}

exports.uploadThumbnail = async (req, res, next) => {
	upload(req, res, err => {
		if (err) {
			console.log(err)
			res.status(500).json({
				message: err,
			})
		}
		res.status(200).json({
			message: "Successfully uploaded thumbnail.",
		})
	})
}

exports.edit = async (req, res, next) => {
	try {
		const newsToEdit = await News.findOne({
			where: {
				id: req.body.newsId,
			},
		})

		if (!newsToEdit) {
			next({
				status: 400,
				message: "Invalid id.",
			})
		}

		newsToEdit = {
			title: req.body.title,
			thumbnail: req.body.thumbnail,
			source: req.body.source,
			tags: req.body.tags,
			body: req.body.body,
		}

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
		const newsToEdit = await News.findOne({
			where: {
				id: req.body.newsId,
			},
		})

		if (!newsToEdit) {
			next({
				status: 400,
				message: "Invalid id.",
			})
		}

		await newsToEdit.destroy()

		res.status(200).json({
			message: "Deleted news successfully.",
		})
	} catch (e) {
		next(e)
	}
}
