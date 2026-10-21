# my-blog

마크다운(`.md`) 파일을 읽어서 블로그 웹사이트로 변환하는 프로젝트입니다.

## 기술 스택 제약

- **프레임워크 금지**: React, Vue, Svelte, Tailwind, Bootstrap 등을 쓰지 않는다. 순수 HTML, CSS, JavaScript(바닐라 ES 모듈)만 사용한다.
- 빌드 도구(번들러, 트랜스파일러)를 도입하지 않는다. 브라우저에서 바로 열리거나 정적 서버로 서빙되어야 한다.
- 마크다운 변환용 외부 라이브러리가 필요하면 먼저 사용자에게 확인한다. 기본 방침은 직접 구현한 작은 파서이며, 지원 문법은 제목, 문단, 목록, 코드 블록, 인라인 코드, 링크, 이미지, 인용, 표, 강조다.
- Node.js(v24)는 로컬 개발용 스크립트(정적 서버, 글 목록 생성)에만 사용하고, 런타임 의존성은 만들지 않는다.

## 디렉토리 구조

```
my-blog/
├── CLAUDE.md
├── index.html          # 글 목록 페이지
├── post.html           # 글 상세 페이지 (?slug=파일명)
├── css/
│   └── style.css       # 전체 스타일 (CSS 변수 기반 네온 테마)
├── js/
│   ├── markdown.js     # 마크다운 → HTML 변환
│   └── app.js          # 라우팅, 글 로딩, 렌더링
├── package.json        # "type": "module" + build:index 스크립트 (런타임 의존성 없음)
├── posts/              # 마크다운 글 (*.md) + index.json (글 목록, 자동 생성) + assets/ (이미지)
└── scripts/
    └── build-index.mjs # posts/*.md → posts/index.json 생성
```

`js/markdown.js`는 DOM을 쓰지 않으므로 `scripts/build-index.mjs`가 `parseFrontmatter`를 그대로 import한다. frontmatter 파싱 로직은 이 한 곳에서만 관리한다.

## 글 작성 규칙

- 글은 `posts/` 아래 `.md` 파일로 둔다. 파일명이 slug가 된다 (예: `hello-world.md`).
- 각 글 맨 위에 frontmatter를 둔다.

```markdown
---
title: 글 제목
date: 2026-01-01
tags: [태그1, 태그2]
summary: 목록에 보일 한 줄 요약
---
```

- `posts/index.json`은 브라우저가 디렉토리를 나열할 수 없어서 필요한 글 목록 파일이며, **직접 수정하지 않고** 생성한다. 글을 추가하거나 frontmatter를 고친 뒤에는 `npm run build:index`(= `node scripts/build-index.mjs`)를 실행한다.
- 글 목록은 날짜 내림차순으로 정렬한다.
- 글 안의 이미지는 `posts/assets/`에 두고, `post.html`이 사이트 루트에 있으므로 경로는 루트 기준으로 쓴다 (예: `![설명](posts/assets/sample.svg)`).
- 이미지는 `loading="lazy"`를 쓰지 않는다. 앱 내 브라우저 패널에서 지연 로딩 이미지가 요청 자체를 보내지 않는 현상이 있었고(원인은 미확인), 이미지가 적은 블로그라 얻는 이득도 작다.

## 디자인 원칙

검은 배경 위에 네온 색 글자를 쓰는 사이버펑크풍 단일 테마다. 읽기 좋은 것은 여전히 중요하다.

- **색상**: 배경은 순수 검정(`#000`), 본문은 네온 그린, 제목은 네온 핑크, 링크/강조/태그는 네온 시안이다. 네온 외의 색을 늘리지 않는다.
- **글로우**: `text-shadow`/`box-shadow`로 발광 효과를 주되, 본문 문단에는 쓰지 않는다. 제목, 브랜드, 카드 hover 같은 곳에만 쓴다.
- **본문 가독성**: 본문 폭은 `max-width: 720px`(약 65~75자), 글자 크기 17~18px, 행간 1.7 이상. 문단 간격을 넉넉히 둔다.
- **타이포그래피**: 시스템 폰트 스택을 쓰고 한글 가독성을 위해 `Pretendard`, `Apple SD Gothic Neo`, `Malgun Gothic`을 포함한다. 한글 줄바꿈은 `word-break: keep-all`을 쓴다. 브랜드, 날짜, 코드는 모노스페이스 스택을 쓴다.
- **코드 블록**: 가로 스크롤을 허용하고 배경색과 테두리로 본문과 구분한다.
- 외부 폰트나 CDN에 의존하지 않는다 (오프라인에서도 보여야 한다).

## 색상 변수

- 색상은 모두 `:root`의 CSS 변수로 정의한다 (`--bg`, `--fg`, `--heading`, `--muted`, `--accent`, `--code-bg`, `--border`, `--glow*` 등). 컴포넌트 CSS에 색상 값을 직접 쓰지 않는다.
- 라이트/다크 전환은 없다. 테마는 하나이며 `color-scheme: dark`로 고정한다.
- 모든 글자색은 검은 배경 위에서 WCAG AA(4.5:1) 이상의 대비를 유지한다. 색을 바꿀 때는 이 대비를 다시 확인한다.

## 모바일 / 반응형

- 모든 페이지에 `<meta name="viewport" content="width=device-width, initial-scale=1">`를 넣는다.
- 모바일 우선(mobile-first)으로 작성하고 `min-width` 미디어 쿼리로 확장한다.
- 좌우 여백은 최소 16px. 가로 스크롤이 생기면 안 된다. 이미지는 `max-width: 100%`, 표와 코드 블록은 자체 스크롤 영역에서 넘치게 한다.
- 터치 대상(버튼, 링크)은 최소 44x44px.
- 360px 폭에서도 깨지지 않아야 한다.

## 접근성

- 시맨틱 태그(`header`, `nav`, `main`, `article`, `footer`)를 쓴다.
- 키보드 포커스 표시(`:focus-visible`)를 유지한다. 포커스 색은 배경과 충분히 대비되어야 한다.
- 이미지에는 `alt`를 넣는다.

## 보안

- 마크다운을 HTML로 변환할 때 원문의 `<`, `>`, `&`를 먼저 이스케이프한다. 링크의 `javascript:` 스킴은 차단한다. 글은 신뢰할 수 있는 로컬 파일이라도 이 규칙을 지킨다.

## 개발 / 실행

`fetch()`로 `.md`를 읽으므로 `file://`로는 동작하지 않는다. 정적 서버로 실행한다.

```bash
npx serve .
# 또는
python -m http.server 8000
```

## 코드 스타일

- JavaScript: ES 모듈(`type="module"`), `const`/`let`, 세미콜론 사용, 함수는 작게 유지한다.
- CSS: 클래스 기반, 짧은 BEM 스타일 네이밍(`.post-card`, `.post-card__title`). `!important`는 쓰지 않는다.
- HTML: 들여쓰기 2칸, 한국어 문서이므로 `<html lang="ko">`.
- 주석과 문서는 한국어로 쓴다. 코드 식별자는 영어를 쓴다.

## 작업 시 주의

- 새 기능은 라이브러리를 추가하기 전에 바닐라로 구현할 수 있는지 먼저 검토한다.
- 변경 후에는 데스크톱 폭과 모바일 폭(375px)에서 모두 확인한다.
- 스타일 수정은 `css/style.css`의 변수와 기존 클래스를 우선 재사용한다.
