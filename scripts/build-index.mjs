// posts/*.md 의 frontmatter를 읽어 posts/index.json 을 생성한다.
// 사용법: node scripts/build-index.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFrontmatter } from '../js/markdown.js';

const postsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'posts');

const files = (await readdir(postsDir)).filter((name) => name.endsWith('.md'));
const posts = [];

for (const file of files) {
  const slug = path.basename(file, '.md');
  const { meta } = parseFrontmatter(await readFile(path.join(postsDir, file), 'utf8'));

  if (!meta.title) console.warn(`경고: ${file} 에 title 이 없어 파일명을 제목으로 사용합니다.`);
  if (!meta.date) console.warn(`경고: ${file} 에 date 가 없습니다.`);

  posts.push({
    slug,
    title: meta.title || slug,
    date: meta.date || '',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    summary: meta.summary || '',
  });
}

posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

await writeFile(path.join(postsDir, 'index.json'), JSON.stringify(posts, null, 2) + '\n');
console.log(`posts/index.json 생성 완료 (${posts.length}개)`);
