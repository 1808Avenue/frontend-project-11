import i18next from 'i18next';
import * as yup from 'yup';
import axios from 'axios';
import onChange from 'on-change';
import _ from 'lodash';
import render, { updatePosts } from './view.js';
import resources from './locales/index.js';
import parse from './parser.js';

const schema = yup.object().shape({
  url: yup.string().url(),
});

export default () => {
  const i18nextInstance = i18next.createInstance();
  i18nextInstance.init({
    lng: 'ru',
    debug: true,
    resources,
  });

  const state = {
    process: 'waiting',
    form: {
      state: 'filling',
      fields: {
        url: '',
      },
    },
    domain: {
      error: null,
    },
    urls: [],
    feeds: [],
    posts: [],
    postsRead: [],
  };

  const elements = {
    formEl: document.querySelector('.rss-form'),
  };

  const watchedState = onChange(state, () => render(state, i18nextInstance));

  elements.formEl.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#url-input');
    const inputValue = input.value;
    watchedState.form.fields.url = inputValue;

    schema.validate(watchedState.form.fields, { abortEarly: false })
      .then(() => {
        const { url } = watchedState.form.fields;
        axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
          .then((response) => {
            const content = parse(response.data.contents);
            const parserError = content.querySelector('parsererror');

            if (parserError === null) {
              const feedId = _.uniqueId();
              const newFeed = {
                title: content.querySelector('title').textContent.trim(),
                description: content.querySelector('description').textContent.trim(),
                id: feedId,
              };

              const urls = watchedState.urls.map((feed) => feed.url);
              if (!urls.includes(url)) {
                watchedState.urls.unshift({ feedId, url });
                watchedState.feeds.unshift(newFeed);

                const items = content.querySelectorAll('item');
                const newPosts = [];
                items.forEach((item) => {
                  const post = {
                    title: item.querySelector('title').textContent.trim(),
                    description: item.querySelector('description').textContent.trim(),
                    link: item.querySelector('link').textContent.trim(),
                    id: _.uniqueId(),
                    feedId,
                  };

                  newPosts.push(post);
                });
                watchedState.posts.unshift(...newPosts);

                watchedState.form.fields.url = '';
                watchedState.process = 'check';
                watchedState.form.state = 'valid';
              } else {
                watchedState.form.state = 'filling';
                watchedState.domain.error = 'duplicate';
              }
            } else {
              watchedState.form.state = 'filling';
              watchedState.domain.error = 'parse-error';
            }
          })
          .then(() => {
            watchedState.form.state = 'filling';
            watchedState.domain.error = null;
          })
          .catch((e) => {
            if (e.name === 'TypeError') {
              watchedState.urls.shift();
              watchedState.feeds.shift();
              watchedState.form.state = 'filling';
              watchedState.domain.error = 'type-error';
              watchedState.domain.error = null;
            } else {
              watchedState.form.state = 'filling';
              watchedState.domain.error = 'network-error';
              watchedState.domain.error = null;
            }
          });
      })
      .catch(() => {
        watchedState.form.state = 'invalid';
      });
  });

  updatePosts(watchedState);
};
