import chalk from "chalk";

export const RequestLogger = (req, _res, next) => {
	const { method, url, body } = req;
	const METHOD = method.toUpperCase();
	const PATH = url;
	const BODY = JSON.stringify(body);
	const COLORIZE = (text, color) => ` ${chalk[color](text)} `;

	switch (METHOD) {
		case "GET":
			console.log(
				chalk.bgGreen(COLORIZE(METHOD, "white")) + COLORIZE(PATH, "white"),
			);
			break;
		case "POST":
			console.log(
				chalk.bgYellow(COLORIZE(METHOD, "white")) +
					COLORIZE(PATH, "white") +
					BODY,
			);
			break;
		case "DELETE":
			console.log(
				chalk.bgRed(COLORIZE(METHOD, "white")) + COLORIZE(PATH, "white"),
			);
			break;
		case "PUT":
		case "PATCH":
			console.log(
				chalk.bgBlue(COLORIZE(METHOD, "white")) + COLORIZE(PATH, "white"),
			);
			break;
		default:
			console.log(
				chalk.bgGray(COLORIZE(METHOD, "white")) + COLORIZE(PATH, "white"),
			);
	}

	next();
};
