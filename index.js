// tooling
const args     = require('./lib/args');
const child    = require('./lib/child_process');
const fs       = require('./lib/fs');
const gitinfo  = require('./lib/gitinfo');
const path     = require('path');
const question = require('./lib/question');

// caching
const answers = {};

// capturing
const keys = /\$\{([^\}]+)\}/g;

// template directory
const tpl = 'template';

// capture answers
(questions => Object.keys(questions).reduce(
	(resolver, key) => resolver.then(
		() => questions[key]()
	).then(
		answer => answers[key] = answer
	),
	Promise.resolve()
).then(
	() => answers
))({
	// --date, or formatted date
	date: () => args('date').catch(
		() => new Date(Date.now()).toLocaleDateString('en-US', {
			weekday: 'narrow',
			year:    'numeric',
			month:   'long',
			day:     'numeric'
		}).slice(3)
	),

	// --title, prompt, or Example
	title: () => args('title').catch(
		() => question('Library Name')
	).catch(
		() => 'Example'
	).then(
		answer => answer
		.trim()
	),

	// --type, prompt, or js
	type: () => args('type').catch(
		() => question('Library Type (dom,node,js,css)')
	).catch(
		() => 'js'
	).then(
		answer => answer.trim().toLowerCase()
	),

	// --logo, or project logo
	logo: () => args('logo').catch(
		() => `http://jonathantneal.github.io/${answers.type}-logo.svg`
	),

	// --id, or formatted title
	id: () => args('id').catch(
		() => answers.title
		.replace(/[^\w]+/g, '-')
		.replace(/^-+|-+$/g, '').toLowerCase()
	),

	// --id-camel, or formatted title
	idCamelCase: () => args('id-camel').catch(
		() => answers.title
	).then(
		answer => answer
		.trim()
		.replace(/[^\w\s]+/g, '-')
		.replace(/(^|\s+)-+/g, '$1')
		.replace(/-+(\s+|$)/g, '$1')
		.replace(/\s+./g, match => match.trim().toUpperCase())
		.replace(/^[A-Z]/, match => match.toLowerCase())
	),

	// --author, gitinfo name, prompt, or W3C Follower
	author: () => args('author').catch(
		() => gitinfo('name')
	).catch(
		() => question('GitHub author')
	).catch(
		() => 'W3C Follower'
	),

	// --email, gitinfo email, prompt, or list@w3c.org
	email: () => args('email').catch(
		() => gitinfo('email')
	).catch(
		() => question('GitHub email')
	).catch(
		() => 'list@w3c.org'
	),

	// --email, gitinfo user, prompt, or w3c
	user: () => args('user').catch(
		() => gitinfo('user')
	).catch(
		() => question('GitHub user')
	).catch(
		() => 'w3c'
	),

	// --keywords, or prompt, and then formatted
	keywords: () => args('keywords').catch(
		() => question('Keywords')
	).catch(
		() => ''
	).then(
		answer => answer.trim().split(/\s*,\s*/).join('",\n    "')
	)
}).then(
	// read template files, update their contents with answers, and write them to the destination
	answers => fs.readdir(path.resolve(__dirname, tpl)).then(
		files => Promise.all(files.map(
			file => fs.readfile(path.resolve(__dirname, tpl, file), 'utf8').then(
				content => content.replace(
					keys,
					(match, key) => answers[key]
				)
			).then(
				content => fs.writefile(path.resolve(__dirname, file), content)
			)
		))
	).then(
		() => Promise.all([
			fs.rmdir(path.resolve(__dirname, '.git')).then(
				() => child(
					'git init',
					{
						cwd: __dirname
					}
				)
			).then(
				() => child(
					`git remote add origin git@github.com:${answers.user}/${answers.id}.git`,
					{
						cwd: __dirname
					}
				)
			),
			fs.rmdir(path.resolve(__dirname, 'lib')),
			fs.rmdir(path.resolve(__dirname, tpl))
		])
	)
).then(
	() => process.exit(0),
	error => console.warn(error) && process.exit(1)
);
