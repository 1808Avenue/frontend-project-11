import i18next from 'i18next';
import * as yup from 'yup';
import _ from 'lodash';
import axios from 'axios';
import onChange from 'on-change';
import render, {
  renderModal, renderPosts, renderReadPosts, updatePosts,
} from './view.js';
import resources from './locales/index.js';
import parse from './parser.js';

const validate = (fields, notOneOf) => {
  const schema = yup.object().shape({
    url: yup.string().url().notOneOf(notOneOf),
  });
  return schema.validate(fields, { abortEarly: false });
};

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
      status: '',
      fields: {
        url: '',
      },
    },
    domain: {
      error: '',
    },
    modal: [],
    urls: [],
    feeds: [],
    posts: [],
    postsRead: [],
  };

  const elements = {
    form: document.querySelector('.rss-form'),
    postsContainer: document.querySelector('.posts'),
    modalContainer: document.querySelector('.modal-content'),
  };

  const watchedState = onChange(state, (path) => {
    if (path === 'posts') {
      renderPosts(watchedState, elements.postsContainer, i18nextInstance);
    }
    if (path === 'postsRead') {
      renderReadPosts(watchedState, elements.postsContainer);
    }
    if (path === 'modal') {
      renderModal(watchedState, elements.modalContainer);
    }
    render(watchedState, i18nextInstance);
  });

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const inputValue = formData.get('url');
    const urls = watchedState.urls.map((feed) => feed.url);
    watchedState.form.fields.url = inputValue;
    watchedState.process = 'adding';
    watchedState.form.status = 'filling';
    watchedState.domain.error = '';

    validate(watchedState.form.fields, urls)
      .then(() => {
        watchedState.process = 'loading';
        const { url } = watchedState.form.fields;
        axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
          .then((response) => {
            watchedState.process = 'loaded';
            const data = parse(response);

            const newFeed = data.feed;
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
            watchedState.form.status = 'valid';
            watchedState.process = 'success';
          })
          .then(() => {
            watchedState.process = 'waiting';
          })
          .catch((e) => {
            if (e.name === 'TypeError') {
              watchedState.domain.error = 'typeError';
              watchedState.form.status = 'invalid';
              watchedState.process = 'failing';
            }
            if (e.message === 'parseError') {
              watchedState.domain.error = 'parseError';
              watchedState.form.status = 'invalid';
              watchedState.process = 'failing';
            }
            if (e.message === 'Network Error') {
              watchedState.domain.error = 'networkError';
              watchedState.form.status = 'invalid';
              watchedState.process = 'failing';
            }
          });
      })
      .catch((e) => {
        if (e.message === 'url must be a valid URL') {
          watchedState.domain.error = 'validationError';
          watchedState.form.status = 'invalid';
          watchedState.process = 'failing';
        } else {
          watchedState.domain.error = 'duplicateError';
          watchedState.form.status = 'invalid';
          watchedState.process = 'failing';
        }
      });
  });

  updatePosts(watchedState);
};
