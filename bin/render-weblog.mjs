#!/usr/bin/env node


import fs           from 'fs';
import path         from 'path';
import { markdown } from './markdown.mjs';


const ROOT     = process.env.PWD + '/weblog';
const DATABASE = [];
const TABSPACE = '\t' + new Array(255).fill('\t').join('');



const _parse_meta = function(article) {

	let tmp = article.trim();
	if (tmp.startsWith('===')) {

		let meta = {};

		let raw = tmp.substr(3, tmp.indexOf('===', 3) - 3).trim();
		if (raw.length > 0) {

			raw.split('\n').forEach(line => {

				if (line.startsWith('-')) line = line.substr(1);

				let tmp = line.trim().split(':');
				let key = tmp[0].trim();
				let val = tmp[1].trim();

				if (val.includes(',')) {
					meta[key] = val.split(',').map(v => v.trim());
				} else {
					meta[key] = val;
				}

			});

		}


		return meta;

	}


	return null;

};

const _walk_fix_url = function(nodes) {

	nodes.forEach(node => {

		if (typeof node !== 'string') {

			if (node.type === 'a') {

				let href = node.href;
				if (href.startsWith('../')) {
					node.href = path.resolve('/weblog/articles', href);
				} else if (href.startsWith('./')) {
					node.href = path.resolve('/weblog/articles', href);
				}

			} else if (node.type === 'img') {

				let src = node.src;
				if (src.startsWith('../')) {
					node.src = path.resolve('/weblog/articles', src);
				} else if (src.startsWith('./')) {
					node.src = path.resolve('/weblog/articles', src);
				}

			}

			if (node.nodes.length > 0) {
				_walk_fix_url(node.nodes);
			}

		}

	});

};

const _render_article = function(template, entry) {

	let meta = entry.meta;
	let html = entry.html;

	template = template.split('${menu}').join('<!-- TBD -->');
	template = template.split('${title}').join(meta.name);
	template = template.split('${headline}').join(meta.name);
	template = template.split('${article}').join(html);
	template = template.split('${description}').join(meta.name);
	template = template.split('${keywords}').join(meta.tags.join(', '));

	return template;

};

const _render_feed = function(template) {

	let articles = [];

	DATABASE.sort((a, b) => {

		if (a.meta.date > b.meta.date) return -1;
		if (b.meta.date > a.meta.date) return  1;
		return 0;

	}).forEach(entry => {

		let meta   = entry.meta;
		let file   = entry.file.split('.').slice(0, -1).join('.');
		let name   = meta.name;
		let tags   = meta.tags;
		let date   = new Date(meta.date).toUTCString();
		let chunk  = '';
		let indent = TABSPACE.substr(0, 2);

		chunk += indent + '<item>\n';
		chunk += indent + '\t<title>' + name + '</title>\n';
		chunk += indent + '\t<description>' + name + '</description>\n';
		chunk += indent + '\t<link>https://cookie.engineer/weblog/articles/' + file + '.html</link>\n';
		chunk += indent + '\t<category>' + tags.join('/') + '</category>\n';
		chunk += indent + '\t<pubDate>' + date + '</pubDate>\n';
		chunk += indent + '</item>';

		articles.push(chunk);

	});


	let date = new Date().toUTCString();

	template = template.replace('${articles}',     articles.join('\n').trim());
	template = template.replace('${copyright}',    '2018-' + new Date().getFullYear());
	template = template.replace('${date-build}',   date);
	template = template.replace('${date-publish}', date);

	return template;

};

const _render_index = function(template) {

	let articles = [];

	DATABASE.forEach(entry => {

		let meta   = entry.meta;
		let file   = entry.file.split('.').slice(0, -1).join('.');
		let name   = '<a href="./articles/' + file + '.html" target="_blank">' + meta.name.split(' ').join('&nbsp;') + '</a>';
		let chunk  = '';
		let indent = TABSPACE.substr(0, 6);

		chunk += indent + '<tr class="' + meta.type.join('-') + '" title="Ingredients: ' + meta.type.join(', ') + '">\n';
		chunk += indent + '\t<td></td>\n';
		chunk += indent + '\t<td>' + meta.date + '</td>\n';
		chunk += indent + '\t<td>' + name + '</td>\n';
		chunk += indent + '\t<td>' + meta.tags.join(', ') + '</td>\n';
		chunk += indent + '</tr>';

		articles.push(chunk);

	});

	template = template.replace('${articles}', articles.join('\n').trim());

	return template;

};

const _parse_body = function(article) {

	let tmp = article.trim();
	if (tmp.startsWith('===')) {
		tmp = tmp.substr(tmp.indexOf('===', 3) + 3).trim();
	}


	let data = markdown.parse(tmp);
	if (data.length > 0) {
		_walk_fix_url(data);
	}

	return data;

};

const _render_body = function(data) {

	let body = markdown.render(data);
	if (body !== null) {
		return body;
	}

	return '';

};



fs.readdir(ROOT + '/articles', (err, files) => {

	files.filter(f => f.endsWith('.md')).forEach(file => {

		fs.readFile(ROOT + '/articles/' + file, 'utf8', (err, article) => {

			if (!err) {

				let meta = _parse_meta(article);
				let body = _parse_body(article);
				let html = _render_body(body);

				if (meta !== null && body !== null && html !== '') {

					let date = meta.date || '';
					let name = meta.name || '';
					let tags = meta.tags || [];
					let type = meta.type || [];

					if (
						/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/g.test(meta.date)
						&& meta.name !== null
						&& meta.tags instanceof Array
						&& meta.type instanceof Array
					) {

						DATABASE.push({
							file: file,
							meta: {
								date: date,
								name: name,
								tags: tags,
								type: type
							},
							body: body,
							html: html
						});

					}

				}

			}

		});

	});

});


setTimeout(_ => {

	fs.readFile(ROOT + '/sources/index.tpl', 'utf8', (err, template) => {

		if (!err) {

			let index = _render_index(template);
			if (index !== '') {
				fs.writeFile(ROOT + '/index.html', index, 'utf8', (err) => {
					if (!err) console.log('> rendering index.html ... OKAY');
				});
			}

		} else {
			console.error('> could not render index.html (no read/write access to template?');
		}

	});

	fs.readFile(ROOT + '/sources/feed.tpl', 'utf8', (err, template) => {

		if (!err) {

			let feed = _render_feed(template);
			if (feed !== '') {
				fs.writeFile(ROOT + '/feed.xml', feed, 'utf8', (err) => {
					if (!err) console.log('> rendering feed.xml ... OKAY');
				});
			}

		} else {
			console.error('> could not render feed.xml (no read/write access to template?');
		}

	});

	fs.readFile(ROOT + '/sources/article.tpl', 'utf8', (err, template) => {

		if (!err) {

			DATABASE.forEach(entry => {

				let article = _render_article(template, entry);
				if (article !== '') {

					let file = entry.file.split('.').slice(0, -1).join('.');

					fs.writeFile(ROOT + '/articles/' + file + '.html', article, 'utf8', (err) => {
						if (!err) console.log('> rendering articles/' + file + '.html ... OKAY');
					});

				}

			});

		} else {
			console.error('> could not render articles (no read/write access to template?');
		}

	});

}, 1000);
