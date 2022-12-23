import _ from 'lodash';

const parse = (response) => {
  const parser = new DOMParser();
  const content = parser.parseFromString(response.data.contents, 'text/xml');
  const parserError = content.querySelector('parsererror');

  if (parserError === null) {
    const feedId = _.uniqueId();
    const newFeed = {
      title: content.querySelector('title').textContent.trim(),
      description: content.querySelector('description').textContent.trim(),
      id: feedId,
      posts: [],
    };

    const items = content.querySelectorAll('item');
    items.forEach((item) => {
      const post = {
        title: item.querySelector('title').textContent.trim(),
        description: item.querySelector('description').textContent.trim(),
        link: item.querySelector('link').textContent.trim(),
        id: _.uniqueId(),
        feedId,
      };
      newFeed.posts.push(post);
    });
    return newFeed;
  }
  return 'parse-error';
};

export default parse;
