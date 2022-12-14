import axios from 'axios';
import _ from 'lodash';
import parse from './parser.js';

const renderFeeds = (watchedState, container, nextInstance) => {
  const { feeds } = watchedState;
  const feedsContainer = container;
  feedsContainer.innerHTML = '';

  const divCardBorder = document.createElement('div');
  divCardBorder.classList.add('card', 'border-0');

  const divCardBody = document.createElement('div');
  divCardBody.classList.add('card-body');

  const h2 = document.createElement('h2');
  h2.classList.add('card-title', 'h4');
  h2.textContent = nextInstance.t('feeds.header');

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

export const renderPosts = (watchedState, container, nextInstance) => {
  const { posts } = watchedState;
  const postsContainer = container;
  postsContainer.innerHTML = '';

  const divCardBorder = document.createElement('div');
  divCardBorder.classList.add('card', 'border-0');

  const divCardBody = document.createElement('div');
  divCardBody.classList.add('card-body');

  const h2 = document.createElement('h2');
  h2.classList.add('card-title', 'h4');
  h2.textContent = nextInstance.t('posts.header');

  const ul = document.createElement('ul');
  ul.classList.add('list-group', 'border-0', 'rounded-0');

  const postReadIds = watchedState.postsRead.map((postRead) => postRead.id);

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
    button.textContent = nextInstance.t('posts.buttons.view');

    li.append(a);
    li.append(button);
    ul.append(li);
  });

  divCardBody.append(h2);
  divCardBorder.append(divCardBody);
  divCardBorder.append(ul);
  container.append(divCardBorder);
};

export const renderReadPosts = (watchedState, container) => {
  watchedState.postsRead.forEach((postRead) => {
    const { id } = postRead;
    const aElement = container.querySelector(`[data-id="${id}"]`);
    aElement.classList.remove('fw-bold');
    aElement.classList.add('fw-normal', 'link-secondary');
  });
};

export const renderModal = (watchedState, container) => {
  const modalTitle = container.querySelector('.modal-title');
  const modalBody = container.querySelector('.modal-body');
  const modalButtonRead = container.querySelector('.full-article');
  const postData = watchedState.modal.reduce((acc, data) => {
    acc.title = data.title;
    acc.description = data.description;
    acc.link = data.link;
    return acc;
  }, {});
  const { title, description, link } = postData;

  modalTitle.textContent = title;
  modalBody.textContent = description;
  modalButtonRead.href = link;
};

export const updatePosts = (watchedState) => {
  const timeOut = 5000;
  const promises = watchedState.urls
    .map(({ feedId, url }) => axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
      .then((response) => {
        const data = parse(response);
        const { feed } = data;
        const { posts } = data;
        feed.id = feedId;

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
        return response;
      })
      .catch(console.log));
  Promise.all(promises).finally(() => setTimeout(() => updatePosts(watchedState), timeOut));
};

const render = (watchedState, nextInstance) => {
  const form = document.querySelector('.rss-form');
  const input = document.querySelector('#url-input');
  const feedBack = document.querySelector('.feedback');
  const feedsContainer = document.querySelector('.feeds');
  const postsContainer = document.querySelector('.posts');
  const buttonAdd = document.querySelector('[type="submit"]');

  const errorHandler = (errorText) => {
    input.classList.add('is-invalid');
    feedBack.classList.remove('text-success');
    feedBack.classList.add('text-danger');
    feedBack.textContent = errorText;
  };

  if (watchedState.process === 'loading') {
    buttonAdd.setAttribute('disabled', 'disabled');
  } else {
    buttonAdd.removeAttribute('disabled');
  }

  if (watchedState.process === 'success') {
    input.classList.remove('is-invalid');
    feedBack.classList.remove('text-danger');
    feedBack.classList.add('text-success');
    feedBack.textContent = nextInstance.t('form.valid');
    form.reset();
    renderFeeds(watchedState, feedsContainer, nextInstance);
  }

  if (watchedState.process === 'failing') {
    const errorName = watchedState.domain.error;
    const errorText = nextInstance.t(`domain.errors.${errorName}`);
    errorHandler(errorText);
  }

  const postElements = postsContainer.querySelectorAll('li');
  postElements.forEach((postElement) => {
    const aElement = postElement.querySelector('a');
    const buttonElement = postElement.querySelector('button');
    const postId = aElement.dataset.id;
    const post = watchedState.posts
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
        const readPostIds = watchedState.postsRead.map((postRead) => postRead.id);
        if (!readPostIds.includes(post.id)) {
          watchedState.postsRead.push({ id: post.id, feedId: post.feedId });
        }
      }
    });

    buttonElement.addEventListener('click', () => {
      const { title, description, link } = post;
      const postData = {
        title,
        description,
        link,
      };
      watchedState.modal.splice(0, 1, postData);
    });
  });
};

export default render;
