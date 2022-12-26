const parse = (response) => {
  const parser = new DOMParser();
  const content = parser.parseFromString(response.data.contents, 'text/xml');
  const parserError = content.querySelector('parsererror');

  if (parserError === null) {
    const title = content.querySelector('title').textContent.trim();
    const description = content.querySelector('description').textContent.trim();
    const feed = {
      title,
      description,
    };

    const items = content.querySelectorAll('item');
    const posts = Array.from(items).map((item) => {
      const itemTitle = item.querySelector('title').textContent.trim();
      const itemDescription = item.querySelector('description').textContent.trim();
      const itemLink = item.querySelector('link').textContent.trim();
      return {
        title: itemTitle,
        description: itemDescription,
        link: itemLink,
      };
    });
    return {
      feed,
      posts,
      error: '',
    };
  }
  return {
    error: 'parseError',
  };
};

export default parse;
