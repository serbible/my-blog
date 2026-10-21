import { parseFrontmatter, renderMarkdown } from './markdown.js';

const SITE_NAME = 'my-blog';
const SLUG_RE = /^[\p{L}\p{N}_-]+$/u;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value || '');
  return match ? `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일` : value || '';
}

function renderTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const list = el('ul', 'tags');
  for (const tag of tags) list.append(el('li', 'tag', tag));
  return list;
}

function renderMeta(post) {
  const meta = el('div', 'meta');
  if (post.date) {
    const time = el('time', '', formatDate(post.date));
    time.dateTime = post.date;
    meta.append(time);
  }
  const tags = renderTags(post.tags);
  if (tags) meta.append(tags);
  return meta;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} (${response.status})`);
  return response.text();
}

// ---------- 글 목록 ----------

async function renderList(container) {
  let posts;
  try {
    posts = JSON.parse(await fetchText('posts/index.json'));
  } catch (error) {
    container.replaceChildren(el('p', 'notice', '글 목록을 불러오지 못했습니다. 정적 서버로 실행했는지 확인해 주세요.'));
    console.error(error);
    return;
  }

  if (posts.length === 0) {
    container.replaceChildren(el('p', 'notice', '아직 작성된 글이 없습니다.'));
    return;
  }

  const list = el('ul', 'post-list');
  for (const post of posts) {
    const card = el('li', 'post-card');

    const title = el('h2', 'post-card__title');
    const link = el('a', '', post.title);
    link.href = `post.html?slug=${encodeURIComponent(post.slug)}`;
    title.append(link);
    card.append(title);

    if (post.summary) card.append(el('p', 'post-card__summary', post.summary));
    card.append(renderMeta(post));
    list.append(card);
  }
  container.replaceChildren(list);
}

// ---------- 글 상세 ----------

function showNotFound(container) {
  document.title = `글을 찾을 수 없습니다 · ${SITE_NAME}`;
  const notice = el('div', 'notice');
  notice.append(el('p', '', '요청한 글을 찾을 수 없습니다.'));
  const back = el('a', '', '글 목록으로 돌아가기');
  back.href = 'index.html';
  notice.append(back);
  container.replaceChildren(notice);
}

async function renderPost(container) {
  const slug = new URLSearchParams(location.search).get('slug');
  if (!slug || !SLUG_RE.test(slug)) {
    showNotFound(container);
    return;
  }

  let text;
  try {
    text = await fetchText(`posts/${encodeURIComponent(slug)}.md`);
  } catch (error) {
    console.error(error);
    showNotFound(container);
    return;
  }

  const { meta, body } = parseFrontmatter(text);
  const title = meta.title || slug;
  document.title = `${title} · ${SITE_NAME}`;

  const header = el('header', 'post-header');
  header.append(el('h1', 'post-header__title', title), renderMeta(meta));

  const content = el('div', 'prose');
  content.innerHTML = renderMarkdown(body);

  const article = el('article');
  article.append(header, content);
  container.replaceChildren(article);
}

// ---------- 시작 ----------

const container = document.getElementById('content');
const page = document.body.dataset.page;
if (container && page === 'list') renderList(container);
if (container && page === 'post') renderPost(container);
