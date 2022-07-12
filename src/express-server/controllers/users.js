// required for sending the confirmation email
const nodemailer = require("nodemailer")

const MAIL_USER = process.env.MAIL_USER
const MAIL_PASS = process.env.MAIL_PASS

const mail = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: MAIL_USER,
		pass: MAIL_PASS,
	},
})

// the / path
const path = require("path")

// required for reading the confirmation email html file
const fs = require("fs")
const regEx = new RegExp(/[$][{][a-zA-Z0-9._#]*[}]/, "gm")

// requried for encrypting passwords
const crypto = require("crypto")

// required for jwt token
const jwt = require("jsonwebtoken")

const privateKey = process.env.PRIVATEKEY

// required for generating a unique id for email verification
const { v1: uuidv1 } = require("uuid")

// database models
const { User, UserJWT, Token, UserFollow } = require("../../database")

// middleware
const middleware = require("./middleware")
const { Op } = require("sequelize")

// the port the api is hosted on
const port = process.env.AUTH_SERVER_PORT

exports.register = async (req, res, next) => {
	try {
		// encrypt password
		const hash = crypto.createHash("sha256")
		hash.update(String(req.body.password))
		const password = hash.digest("hex")

		// create the User instance
		const user = await User.create({
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			fullName: req.body.fullName,
			email: req.body.email,
			password,
			profilePicture: req.body?.profilePicture,
			type: req.body.type,
		})

		if (user.type === "author") {
			await user.update({
				writtenNews: 0,
				followers: 0,
			})

			await user.save()
		}

		// create the temporary token for the user
		const uuid = uuidv1()

		// create the Token instance
		await Token.create({
			UserId: user.id,
			token: uuid,
		})

		// send a verification email to the user if there are credentials available for the email in the .env file
		if (MAIL_USER && MAIL_PASS) {
			// get the template email
			const mailString = fs.readFileSync(
				path.resolve("src/express-server/views/confirmationMail.html"),
				{
					encoding: "utf8",
				}
			)

			// replace the placeholders with the user data
			const result = middleware.replaceFileText(
				mailString,
				mailString.match(regEx),
				{
					firstName: user.firstName,
					port,
					uuid,
				}
			)

			const mailOptions = {
				from: MAIL_USER,
				to: user.email,
				subject: "YorkNews account confirmation",
				html: result,
			}

			mail.sendMail(mailOptions, (e, info) => {
				if (e) {
					console.error(e)
				} else {
					console.log("Email sent: " + info.response)
				}
			})
		} else {
			console.log(
				`Email sent to ${user.firstName}, verification url: http://localhost:${port}/users/verify?token=${uuid}`
			)
		}

		res.status(200).json({
			message:
				"Registered successfully. Check your email to verify your account.",
			user: {
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.fullName,
				email: user.email,
				verified: false,
				profilePicture: user.profilePicture,
				type: user.type,
				writtenNews: user?.writtenNews,
				followers: user?.followers,
			},
		})
	} catch (e) {
		if (e == "SequelizeUniqueConstraintError: Validation error") {
			const error = "Email is already used"
			console.error(`Error: ${error}`)
			res.status(403).json({ error })
		} else {
			next(e)
		}
	}
}

exports.login = async (req, res, next) => {
	try {
		// find the user based on email
		const user = await User.findOne({
			where: {
				email: req.body.email,
			},
		})

		// if there is no user found, it means the email was invalid
		if (!user) {
			next({
				status: 400,
				message: "Invalid email.",
			})
		}

		// encrpyt the password
		const hash = crypto.createHash("sha256")
		hash.update(String(req.body.password))
		const password = hash.digest("hex")

		// compare the encrypted passwords, this way the real password of the user is never revealed
		if (user.password !== password) {
			next({
				status: 403,
				message: "Password does not match.",
			})
		}

		// create the JWT of the user
		const token = jwt.sign({ id: user.id }, privateKey)

		// create the UserJWT instance so we can keep track of the user
		await UserJWT.create({
			UserId: user.id,
			jwt: token,
		})

		res.status(200).json({
			message: "Logged in successfully.",
			token,
			user: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.fullName,
				email: user.email,
				verified: user.verified,
				profilePicture: user.profilePicture,
				type: user.type,
			},
		})
	} catch (e) {
		next(e)
	}
}

// email confirmation
// the verification is done by the user by accessing the link sent in the email with the temporary token in the url
exports.verify = async (req, res, next) => {
	try {
		// if the there is no token in the url, we throw an error
		if (!req.query.token) {
			next({
				status: 400,
				message: "No token provided",
			})
		}

		// try to find the Token instance with the given token
		// this is the verification session
		const userToken = await Token.findOne({
			where: { token: req.query.token },
		})

		// if there is no session found, it means that either the token is invalid or the email has already been verified
		if (!userToken) {
			next({
				status: 400,
				message: "Invalid token or email already verified",
			})
		}

		// find the user based on the session's userId
		const user = await User.findOne({
			where: { id: userToken.UserId },
		})

		// verify the user
		user.verified = true
		// update the user
		await user.save()

		// destroy the verification session
		await userToken.destroy()

		res.status(200).send("Email verified successfully.")
	} catch (e) {
		next(e)
	}
}

// when a user wants to reset the password, they will recieve an email to confirm that they want to change their password
exports.verifyPasswordReset = async (req, res, next) => {
	try {
		// find the user based on email
		const user = await User.findOne({
			where: { email: req.body.email },
		})

		// if there is no user found, it means that the email is invalid
		if (!user) {
			next({
				status: 400,
				message: "Invalid email.",
			})
		}

		// create the temporary token for the user
		const uuid = uuidv1()

		// create a Token instance
		// this is a temporary session for verification
		await Token.create({
			UserId: user.id,
			token: uuid,
		})

		// send a verification email to the user if there are credentials available for the email in the .env file
		if (MAIL_USER && MAIL_PASS) {
			// get the template email
			const mailString = fs.readFileSync(
				path.resolve("src/express-server/views/passwordResetMail.html"),
				{
					encoding: "utf8",
				}
			)

			// replace the placeholders with the user data
			const result = middleware.replaceFileText(
				mailString,
				mailString.match(regEx),
				{
					firstName: user.firstName,
					port,
					uuid,
				}
			)

			const mailOptions = {
				from: MAIL_USER,
				to: user.email,
				subject: "YorkNews account confirmation",
				html: result,
			}

			mail.sendMail(mailOptions, (e, info) => {
				if (e) {
					console.error(e)
				} else {
					console.log("Email sent: " + info.response)
				}
			})
		} else {
			console.log(
				`Email sent to ${user.firstName}, verification url: http://localhost:${port}/users/reset-password?token=${uuid}`
			)
		}

		res
			.status(200)
			.send({ message: "Check your email in order to reset your password." })
	} catch (e) {
		next(e)
	}
}

// password reset
// the verification is done by the user by accessing the link sent in the email with the temporary token in the url
exports.resetPassword = async (req, res, next) => {
	try {
		// if the there is no token in the url, we throw an error
		if (!req.query.token) {
			next({
				status: 400,
				message: "No token provided",
			})
		}

		// try to find the Token instance with the given token
		// this is the verification session
		const userToken = await Token.findOne({
			where: { token: req.query.token },
		})

		// if there is no session found, it means that either the token is invalid or the email has already been verified
		if (!userToken) {
			next({
				status: 400,
				message: "Invalid token or password reset expired",
			})
		}

		// find the user based on the session's userId
		const user = await User.findOne({
			where: { id: userToken.UserId },
		})

		// in order to further reset the password the user must provide both the old password and the new password
		// encrpy the old password
		const hash = crypto.createHash("sha256")
		hash.update(String(req.body.password))
		const password = hash.digest("hex")

		// encrypt the new password
		const hash2 = crypto.createHash("sha256")
		hash2.update(String(req.body.newPassword))
		const newPassword = hash2.digest("hex")

		// check if the old password matches the current password of the account
		// if it doesn't we throw an error
		if (user.password !== password) {
			next({
				status: 403,
				message: "Password does not match.",
			})
		}

		// update the password of the user
		user.password = newPassword
		// save the changes
		await user.save()

		// destroy the verification session
		await userToken.destroy()

		res.status(200).send("Password reset successfully.")
	} catch (e) {
		next(e)
	}
}

exports.signOut = async (req, res, next) => {
	try {
		// get the JWT token from the current user
		const userJWT = await UserJWT.findOne({
			where: { UserId: res.locals.userId },
		})

		// destroy the session
		await userJWT.destroy()

		res.status(200).send("Signed out successfully.")
	} catch (e) {
		next(e)
	}
}

exports.follow = async (req, res, next) => {
	try {
		const author = await User.findOne({
			where: { id: req.params.authorId, type: "author" },
		})

		if (!author) {
			return next({
				status: 404,
				message: "Author not found.",
			})
		}

		if (author.id === res.locals.userId) {
			return next({
				status: 400,
				message: "You can't follow yourself.",
			})
		}

		// check if there is already a follow link between the user and author
		const link = await UserFollow.findOne({
			where: {
				UserId: res.locals.userId,
				authorId: author.id,
			},
		})

		if (link) {
			return next({
				status: 400,
				message: "You already follow this author.",
			})
		}

		await UserFollow.create({
			UserId: res.locals.userId,
			authorId: author.id,
		})

		await author.update({
			followers: author.followers + 1,
		})

		res.status(200).send("Author followed successfully.")
	} catch (e) {
		next(e)
	}
}

exports.unfollow = async (req, res, next) => {
	try {
		const author = await User.findOne({
			where: { id: req.params.authorId, type: "author" },
		})

		if (!author) {
			return next({
				status: 404,
				message: "Author not found.",
			})
		}

		if (author.id === res.locals.userId) {
			return next({
				status: 400,
				message: "You can't unfollow yourself.",
			})
		}

		// check if there is already a follow link between the user and author
		const link = await UserFollow.findOne({
			where: {
				UserId: res.locals.userId,
				authorId: author.id,
			},
		})

		if (!link) {
			return next({
				status: 400,
				message: "You are not following this author.",
			})
		}

		await link.destroy()

		await author.update({
			followers: author.followers - 1,
		})

		res.status(200).send("Author unfollowed successfully.")
	} catch (e) {
		next(e)
	}
}
