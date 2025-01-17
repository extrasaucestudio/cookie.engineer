
(function(global) {

	global.addEventListener('DOMContentLoaded', () => {

		const doc      = global.document;
		const menu     = doc.querySelector('header aside#menu');
		const button   = doc.querySelector('header aside#menu a#menu-button');
		const items    = Array.from(menu.querySelectorAll('a[href]')).filter((a) => a !== button && a.getAttribute('href').startsWith('#'));
		const links    = Array.from(doc.querySelectorAll('article a')).filter((a) => a.getAttribute('href').startsWith('#'));
		const sections = items.map((a) => a.href).map((url) => {

			let id = url.split('#').pop();
			let element = doc.querySelector('#' + id);
			if (element !== null) {
				return element;
			}

			return null;

		}).filter((section) => section !== null);



		/*
		 * HELPERS
		 */

		const add_state = (element, state) => {

			let states = element.className.trim().split(' ');
			if (states.includes(state) === false) {
				states.push(state);
			}

			element.className = states.join(' ');

		};

		const del_state = (element, state) => {

			let states = element.className.trim().split(' ');
			if (states.includes(state) === true) {
				states.splice(states.indexOf(state), 1);
			}

			element.className = states.join(' ');

		};

		const has_state = (element, state) => {

			let states = element.className.trim().split(' ');
			if (states.includes(state) === true) {
				return true;
			}

			return false;

		};

		const scroll_to_element = (query) => {

			let element = doc.querySelector(query);
			if (element !== null) {

				if (element.tagName.toLowerCase() === 'section') {

					let headline = element.querySelector('h1');
					if (headline !== null) {
						element = headline;
					}

				} else if (element.tagName.toLowerCase() === 'article') {
					// Do Nothing
				}

			}

			if (element !== null) {

				element.scrollIntoView({
					behavior: 'smooth',
					block:    'center',
					inline:   'nearest'
				});

				return true;

			}


			return false;

		};

		const scroll_to_item = (height) => {

			let candidates = sections.slice(0).reverse();
			if (candidates.length > 0) {

				let found = candidates.find((section) => {

					let rect = section.getBoundingClientRect();
					if (rect.top > 0 && rect.top < height / 2) {
						return true;
					}

					return false;

				}) || null;

				if (found === null) {
					found = candidates.find((section) => {
						return section.getBoundingClientRect().top < 0;
					}) || null;
				}


				if (found !== null) {

					let item = items.find((item) => {

						let id = item.href.split('#/').pop();
						if (id === found.id) {
							return true;
						}

						return false;

					}) || null;

					if (item !== null && item.className !== 'active') {

						items.forEach((other) => {
							other.className = other === item ? 'active' : '';
						});

						return '#/' + found.id;

					}

				}

			}


			return null;

		};



		if (menu !== null) {

			if (typeof global.scrollY === 'number') {

				let offset  = global.scrollY;
				let current = 0;

				global.addEventListener('scroll', () => {
					current = global.scrollY;
				}, true);

				setInterval(() => {

					let delta = current - offset;
					if (delta > 32) {

						del_state(menu, 'open');
						del_state(menu, 'visible');
						items.forEach((item) => item.className = '');

					} else if (delta < -32) {

						add_state(menu, 'visible');

					}

					let height = global.innerHeight || 0;
					let hash   = scroll_to_item(height);
					if (hash !== null) {
						global.location.hash = hash;
					}

					offset = current;

				}, 250);

			}

		}

		if (menu !== null && button !== null) {

			button.addEventListener('click', (event) => {

				let state = has_state(menu, 'open');
				if (state === true) {
					del_state(menu, 'open');
				} else {
					add_state(menu, 'open');
				}

				event.preventDefault();
				event.stopPropagation();

			}, true);

		}

		if (items.length > 0) {

			items.forEach((item) => {

				let href = '#/' + item.getAttribute('href').split('#').pop();
				if (href === global.location.hash) {
					item.className = 'active';
				}

				item.href    = href;
				item.onclick = function() {

					let result = scroll_to_element('#' + this.href.split('#/').pop());
					if (result === true) {

						let state = has_state(menu, 'open');
						if (state === true) {
							del_state(menu, 'open');
						}

					}

				};

			});

		}

		if (links.length > 0) {

			links.forEach((link) => {

				link.href    = '#/' + link.getAttribute('href').split('#').pop();
				link.onclick = function() {
					scroll_to_element('#' + this.href.split('#/').pop());
				};

			});

		}

		setTimeout(() => {

			let tabbable = Array.from(doc.querySelectorAll('a[href], abbr, button, input, select, textarea'));
			if (tabbable.length > 0) {

				tabbable.forEach((element, index) => {
					element.setAttribute('tabindex', index + 1);
				});

			}

		}, 500);

	}, true);

})(typeof window !== 'undefined' ? window : this);

