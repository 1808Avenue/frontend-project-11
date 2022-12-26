import i18next from 'i18next';
import * as yup from 'yup';
import _ from 'lodash';
import axios from 'axios';
import onChange from 'on-change';
import render, { renderPosts, updatePosts } from './view.js';
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
    form: document.querySelector('.rss-form'),
    postsContainer: document.querySelector('.posts'),
  };

  const watchedState = onChange(state, (path) => {
    if (path === 'posts') {
      renderPosts(state, elements.postsContainer, i18nextInstance);
    }
    render(state, i18nextInstance);
  });

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const inputValue = formData.get('url');
    watchedState.form.fields.url = inputValue;
    watchedState.form.state = 'loading';

    schema.validate(watchedState.form.fields, { abortEarly: false })
      .then(() => {
        const { url } = watchedState.form.fields;
        axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
          .then((response) => {
            watchedState.form.state = 'loaded';
            const data = parse(response);
            const newFeed = data.feed;
            if (data.error !== 'parseError') {
              const urls = watchedState.urls.map((feed) => feed.url);

              if (!urls.includes(url)) {
                newFeed.id = _.uniqueId();
                const feedId = newFeed.id;
                watchedState.urls.unshift({ feedId, url });
                watchedState.feeds.unshift(newFeed);

                const posts = data.posts.map((item) => {
                  const post = item;
                  post.id = _.uniqueId();
                  post.feedId = feedId;
                  return post;
                });
                watchedState.posts.unshift(...posts);

                watchedState.form.fields.url = '';
                watchedState.form.state = 'valid';
              } else {
                watchedState.form.state = 'filling';
                watchedState.domain.error = 'duplicate';
              }
            } else {
              watchedState.form.state = 'filling';
              watchedState.domain.error = 'parseError';
            }
          })
          .then(() => {
            watchedState.form.state = 'filling';
            watchedState.domain.error = null;
          })
          .catch((e) => {
            if (e.name === 'TypeError') {
              watchedState.form.state = 'filling';
              watchedState.domain.error = 'typeError';
              watchedState.domain.error = null;
            } else {
              watchedState.form.state = 'filling';
              watchedState.domain.error = 'networkError';
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
