// tooling
const fs   = require('fs');
const path = require('path');

Object.assign(
	exports,
	// extend with fs methods
	fs,
	// extend with then-ified fs methods
	...[
		'access',
		'appendFile',
		'chmod',
		'chown',
		'close',
		'exists',
		'fchmod',
		'fchown',
		'fdatasync',
		'fstat',
		'fsync',
		'ftruncate',
		'futimes',
		'lchmod',
		'lchown',
		'link',
		'lstat',
		'mkdtemp',
		'open',
		'read',
		'readdir',
		'readFile',
		'readlink',
		'realpath',
		'rename',
		'stat',
		'symlink',
		'truncate',
		'unlink',
		'utimes',
		'write'
	].map(
		(name) => ({
			[name.toLowerCase()]: (...args) => new Promise(
				(resolve, reject) => fs[name](
					...args,
					(error, ...result) => error ? reject(error) : resolve(...result)
				)
			)
		})
	),
	// extend with mkdir-ified fs methods
	...['mkdir', 'writeFile'].map(
		(key) => ({
			[key.toLowerCase()]: (target, ...args) => new Promise(
				(resolve, reject) => fs[key](
					target,
					...args,
					(error, ...result) => (
						// if there is no parent directory
						error && error.code === 'ENOENT'
						// resolve with a promise to make the parent directory
						? resolve(
							exports.mkdir(
								path.dirname(target)
							).then(
								// and then try again
								() => exports[key](target, ...args)
							)
						)
						// otherwise
						: (
							// if there is an error not about the directory already existing
							error && error.code !== 'EEXIST'
							// reject with the error
							? reject(error)
							// otherwise, resolve
							: resolve(...result)
						)
					)
				)
			)
		})
	),
	// extend with then-ified touchFile
	{
		touchfile: (target) => new Promise(
			(resolve, reject) => fs.open(
				target,
				'wx',
				(error, ...result) => (
					// if there is no parent directory
					error && error.code === 'ENOENT'
					// resolve with a promise to make the parent directory
					? resolve(
						exports.mkdir(
							path.dirname(target)
						).then(
							// and then try again
							() => exports.touchfile(target)
						)
					)
					// otherwise
					: (
						// if there is an error not about the directory already existing
						error && error.code !== 'EEXIST'
						// reject with the error
						? reject(error)
						// otherwise, resolve
						: resolve(...result)
					)
				)
			)
		)
	},
	// extend with then-ified copyFile
	{
		copyfile: (source, target) => new Promise(
			(resolve, reject) => {
				const readStream  = exports.createReadStream(source);
				const writeStream = exports.createWriteStream(target);

				readStream.on('error', prereject);

				writeStream.on('error', prereject);
				writeStream.on('finish', resolve);

				readStream.pipe(writeStream);

				function prereject(error) {
					readStream.destroy();
					writeStream.end();

					reject(error);
				}
			}
		).catch(
			(error) => {
				console.log(error);

				throw error;
			}
		)
	},
	// extend with then-ified copyFile
	{
		copydir: (source, target) => exports.mkdir(target).then(
			(...result) => exports.readdir(source).then(
				(children) => Promise.all(
					children.map(
						(child) => [
							path.resolve(source, child),
							path.resolve(target, child)
						]
					).map(
						([sourceChild, targetChild]) => exports.lstat(sourceChild).then(
							(stat) => stat.isDirectory()
							? exports.copydir(sourceChild, targetChild)
							: exports.copyfile(sourceChild, targetChild)
						)
					)
				).then(
					() => Promise.resolve(...result)
				)
			)
		)
	},
	// extend with then-ified rmdir
	{
		rmdir: (target, ...args) => new Promise(
			(resolve, reject) => fs.rmdir(
				target,
				...args,
				(error, ...result) => error
				? error.code === 'ENOTEMPTY'
					? resolve(
						exports.readdir(target).then(
							(children) => Promise.all(
								children.map(
									(child) => path.resolve(target, child)
								).map(
									(child) => exports.lstat(child).then(
										(stat) => stat.isDirectory()
										? exports.rmdir(child, ...args)
										: exports.unlink(child)
									)
								)
							)
						).then(
							() => exports.rmdir(target, ...args)
						)
					)
					: reject(error)
				: resolve(...result)
			)
		)
	}
);
