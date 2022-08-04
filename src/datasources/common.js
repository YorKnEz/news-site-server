const { DataSource } = require("apollo-datasource")
const { UserInputError } = require("apollo-server")
const { Op } = require("sequelize")

const { Comment, News, UserVote, UserSave } = require("../database")
const { handleError } = require("../utils")

class CommonAPI extends DataSource {
	constructor() {
		super()
	}


module.exports = CommonAPI
