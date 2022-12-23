import axios from 'axios';
import _ from 'lodash';
import parse from './parser.js';

const renderFeeds = (state, container) => {
  const { feeds } = state;
  const feedsContainer = container;
  feedsContainer.innerHTML = '';

  const divCardBorder = document.createElement('div');
  divCardBorder.classList.add('card', 'border-0');

  const divCardBody = document.createElement('div');
  divCardBody.classList.add('card-body');

  const h2 = document.createElement('h2');
  h2.classList.add('card-title', 'h4');
  h2.textContent = 'Фиды';

  const ul = document.createElement('ul');
  ul.classList.add('list-group', 'border-0', 'rounded-0');

  // -------------
  feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'border-0', 'border-end-0');

    const h3 = document.createElement('h3');
    h3.classList.add('h6', 'm-0');
    h3.textContent = feed.title;

    const p = document.createElement('p');
    p.classList.add('m-0', 'small', 'text-black-50');
    p.textContent = feed.description;

    li.append(h3);
    li.append(p);
    ul.append(li);
  });

  divCardBody.append(h2);
  divCardBorder.append(divCardBody);
  divCardBorder.append(ul);
  container.append(divCardBorder);
};

const renderPosts = (state, container, nextInstance) => {
  const { posts } = state;
  const postsContainer = container;
  postsContainer.innerHTML = '';

  const divCardBorder = document.createElement('div');
  divCardBorder.classList.add('card', 'border-0');

  const divCardBody = document.createElement('div');
  divCardBody.classList.add('card-body');

  const h2 = document.createElement('h2');
  h2.classList.add('card-title', 'h4');
  h2.textContent = 'Посты';

  const ul = document.createElement('ul');
  ul.classList.add('list-group', 'border-0', 'rounded-0');

  const postReadIds = state.postsRead.map((postRead) => postRead.id);

  posts.forEach((post) => {
    const { title } = post;
    const { link } = post;

    const li = document.createElement('li');
    const dataId = post.id;
    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
    const a = document.createElement('a');
    a.href = link;

    if (postReadIds.includes(post.id)) {
      a.classList.add('fw-normal', 'link-secondary');
    } else {
      a.classList.add('fw-bold');
    }

    a.setAttribute('data-id', dataId);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.textContent = title;

    const button = document.createElement('button');
    button.classList.add('btn', 'btn-outline-primary', 'btn-sm');
    button.setAttribute('type', 'button');
    button.setAttribute('data-id', dataId);
    button.setAttribute('data-bs-toggle', 'modal');
    button.setAttribute('data-bs-target', '#modal');
    button.textContent = nextInstance.t('buttons.view');

    li.append(a);
    li.append(button);
    ul.append(li);
  });

  divCardBody.append(h2);
  divCardBorder.append(divCardBody);
  divCardBorder.append(ul);
  container.append(divCardBorder);
};

export const updatePosts = (state) => {
  const checkNewPost = (watchedState) => {
    watchedState.urls.forEach(({ feedId, url }) => {
      axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
        .then((response) => {
          const feed = parse(response);
          console.log(watchedState);
          const { posts } = feed;

          const loadedLinks = watchedState.posts.map((post) => post.link);
          const newPosts = [];

          posts.forEach((post) => {
            if (!loadedLinks.includes(post.link)) {
              const newPost = {
                title: post.title,
                description: post.description,
                link: post.link,
                id: _.uniqueId(),
                feedId,
              };
              newPosts.push(newPost);
            }
          });
          if (newPosts.length !== 0) {
            watchedState.posts.unshift(...newPosts);
          }
        });
    });
    updatePosts(watchedState);
  };

  setTimeout(() => checkNewPost(state), 5000);
};

const changeClass = (input, feedBack) => {
  input.classList.add('is-invalid');
  feedBack.classList.remove('text-success');
  feedBack.classList.add('text-danger');
};

const render = (state, nextInstance) => {
  const form = document.querySelector('.rss-form');
  const input = document.querySelector('#url-input');
  const feedBack = document.querySelector('.feedback');
  const feedsContainer = document.querySelector('.feeds');
  const postsContainer = document.querySelector('.posts');
  const buttonAdd = document.querySelector('[type="submit"]');

  const modalContainer = document.querySelector('.modal-content');
  const modalHeader = modalContainer.querySelector('.modal-header');
  const modalTitle = modalHeader.querySelector('.modal-title');
  const modalBody = modalContainer.querySelector('.modal-body');
  const modalButtonRead = modalContainer.querySelector('.full-article');

  if (state.form.state === 'loading') {
    buttonAdd.setAttribute('disabled', 'disabled');
  } else {
    buttonAdd.removeAttribute('disabled');
  }
  if (state.form.state === 'valid') {
    input.classList.remove('is-invalid');
    feedBack.classList.remove('text-danger');
    feedBack.classList.add('text-success');
    feedBack.textContent = nextInstance.t('form.valid');
    form.reset();
    renderFeeds(state, feedsContainer);
  }

  if (state.process === 'check') {
    renderPosts(state, postsContainer, nextInstance);

    const postElements = postsContainer.querySelectorAll('li');
    postElements.forEach((postElement) => {
      const aElement = postElement.querySelector('a');
      const buttonElement = postElement.querySelector('button');
      const postId = aElement.dataset.id;
      const post = state.posts
        .filter((currentPost) => currentPost.id === postId)
        .reduce((acc, currentPost) => {
          acc.title = currentPost.title;
          acc.description = currentPost.description;
          acc.link = currentPost.link;
          acc.id = currentPost.id;
          acc.feedId = currentPost.feedId;
          return acc;
        }, {});

      postElement.addEventListener('click', (event) => {
        const { target } = event;
        if (target.nodeName === 'A' || target.nodeName === 'BUTTON') {
          aElement.classList.remove('fw-bold');
          aElement.classList.add('fw-normal', 'link-secondary');
          state.postsRead.push(post);
        }
      });

      buttonElement.addEventListener('click', () => {
        modalTitle.textContent = post.title;
        modalBody.textContent = post.description;
        modalButtonRead.href = post.link;
      });
    });
  }

  if (state.form.state === 'invalid') {
    changeClass(input, feedBack);
    feedBack.textContent = nextInstance.t('form.invalid');
  }

  if (state.domain.error === 'duplicate') {
    changeClass(input, feedBack);
    feedBack.textContent = nextInstance.t('domain.errors.duplicate');
  }

  if (state.domain.error === 'network-error') {
    changeClass(input, feedBack);
    feedBack.textContent = nextInstance.t('domain.errors.networkError');
  }
  if (state.domain.error === 'type-error') {
    changeClass(input, feedBack);
    feedBack.textContent = nextInstance.t('domain.errors.typeError');
  }
  if (state.domain.error === 'parse-error') {
    changeClass(input, feedBack);
    feedBack.textContent = nextInstance.t('domain.errors.parseError');
  }
};

export default render;
