const express = require("express")

exports.uploadThumbnail = async (req, res, next) => {
	try {
		if (!req.files || Object.keys(req.files).lenght === 0)
			return next({
				status: 400,
				message: "No files were uploaded.",
			})

		const thumbnail = req.files.file
		const uploadPath = __dirname + "/../../../public/" + thumbnail.name

		thumbnail.mv(uploadPath, err => {
			if (err)
				return next({
					status: 500,
					message: err,
				})
		})

		res.status(200).send("File uploaded")
	} catch (e) {
		next(e)
	}
}
