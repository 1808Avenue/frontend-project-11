const parse = (content) => {
  const parser = new DOMParser();
  return parser.parseFromString(content, 'text/xml');
};

export default parse;
