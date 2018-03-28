// dash option capturing
const dash = /^--([^=]+)=(.+)$/;

// dashed arguments
const results = Object.assign({}, ...process.argv.filter(
	(arg) => dash.test(arg)
).map(
	(arg) => arg.match(dash).slice(1)
).map(
	(arg) => ({
		[arg[0]]: arg[1]
	})
));

// then-ified dashed arguments
module.exports = (key) => key in results ? Promise.resolve(results[key]) : Promise.reject();
