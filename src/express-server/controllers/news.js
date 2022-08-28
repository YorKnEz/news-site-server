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

const upload = multer({ storage }).single("file")

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
