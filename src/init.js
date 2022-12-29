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

const validate = (watchedState) => {
  const { fields } = watchedState.form;
  const urls = watchedState.urls.map((feed) => feed.url);

  const schema = yup.object().shape({
    url: yup.string().url().notOneOf(urls),
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
    form: {
      status: 'filling',
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
    watchedState.form.fields.url = inputValue;
    watchedState.form.status = 'filling';
    watchedState.domain.error = '';

    validate(watchedState)
      .then(() => {
        watchedState.form.status = 'loading';
        const { url } = watchedState.form.fields;
        axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
          .then((response) => {
            watchedState.form.status = 'loaded';
            const data = parse(response);
            const newFeed = data.feed;
            if (data.error !== 'parseError') {
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
            } else {
              watchedState.domain.error = 'parseError';
            }
          })
          .then(() => {
            watchedState.form.status = 'filling';
            watchedState.domain.error = '';
          })
          .catch((e) => {
            if (e.name === 'TypeError') {
              watchedState.domain.error = 'typeError';
            } else {
              watchedState.domain.error = 'networkError';
            }
          });
      })
      .catch((e) => {
        if (e.message === 'url must be a valid URL') {
          watchedState.form.status = 'invalid';
        } else {
          watchedState.domain.error = 'duplicate';
        }
      });
  });

  updatePosts(watchedState);
};
