// 냥멍 블로그 만들기 — _blog_src/*.html (머리말 + 본문) → blog/ 아래 정적 페이지.
// 실행: node _tools/build-blog.mjs   (주소를 바꾸려면 --base=https://…/blog/)
// _ 로 시작하는 폴더는 GitHub Pages(Jekyll)가 올리지 않는다 — 원본·도구는 공개되지 않는다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const SRC = path.join(ROOT, '_blog_src');
const OUT = path.join(ROOT, 'blog');
const arg = process.argv.find(a => a.startsWith('--base='));
const BASE = (arg ? arg.slice(7) : 'https://petsaju.nibb.ink/blog/').replace(/\/?$/, '/');
const SITE = BASE.replace(/blog\/$/, '');
const PLAY = 'https://play.google.com/store/apps/details?id=kr.nyangmeong.saju';
const APP_STORE = 'https://apps.apple.com/kr/app/id6836223771';
const IOS_LIVE = false; // 애플 승인 뒤 true (index.html 의 IOS_LIVE 와 같이)
const CATS = { saju: '사주 기초', age: '나이 계산', day: '생일·기념일' };
const BLOG = '냥멍 블로그';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => s.replace(/<[^>]+>/g, '');

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^<!--\n([\s\S]*?)\n-->\n([\s\S]*)$/);
  if (!m) throw new Error('머리말 없음: ' + file);
  const meta = { faq: [], summary: [] };
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
    if (k === 'faq') { const [q, a] = v.split('::').map(s => s.trim()); meta.faq.push({ q, a }); }
    else if (k === 'summary') meta.summary.push(v);
    else if (k === 'related') meta.related = v.split(',').map(s => s.trim()).filter(Boolean);
    else meta[k] = v;
  }
  for (const k of ['slug', 'title', 'description', 'category', 'date', 'keyword', 'emoji']) if (!meta[k]) throw new Error(`${file}: ${k} 없음`);
  if (!CATS[meta.category]) throw new Error(`${file}: 모르는 분류 ${meta.category}`);
  meta.body = m[2].trim();
  meta.updated = meta.updated || meta.date;
  return meta;
}

const posts = fs.readdirSync(SRC).filter(f => f.endsWith('.html')).map(f => parse(path.join(SRC, f)))
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
const bySlug = Object.fromEntries(posts.map(p => [p.slug, p]));

const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 1.8 13.4 12l-9.8 10.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1Zm10.9 11.3 2.6 2.6-11.4 6.5 8.8-9.1Zm3.9-3.8 3 1.7c.8.5.8 1.6 0 2l-3 1.8-2.9-2.8 2.9-2.7ZM5.7 1.8l11.4 6.5-2.6 2.6-8.8-9.1Z"/></svg>';
const ICON_APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.5 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.8-1-2.8-4.2ZM14 5.2c.7-.8 1.2-2 1-3.2-1 0-2.3.7-3 1.5-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.4Z"/></svg>';
const stores = `<div class="stores">
<a class="store" href="${PLAY}">${ICON_PLAY}<span><small>안드로이드</small><b>Google Play</b></span></a>
${IOS_LIVE ? `<a class="store" href="${APP_STORE}">${ICON_APPLE}<span><small>아이폰</small><b>App Store</b></span></a>`
    : `<span class="store off">${ICON_APPLE}<span><small>아이폰 · 심사 중</small><b>App Store</b></span></span>`}
</div>`;

const head = ({ title, desc, url, type = 'website', ld }) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${BLOG}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}og.png"><meta property="og:locale" content="ko_KR"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../og-icon.png"><link rel="stylesheet" href="blog.css?v=1">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head><body>`;

const header = `<header class="top"><div class="in"><a class="brand" href="./"><img src="../og-icon.png" alt="" width="30" height="30"><span>냥멍<b>블로그</b></span></a>
<nav><a href="./">전체 글</a><a href="./#cat-saju">사주</a><a href="./#cat-age">나이 계산</a><a class="get" href="${PLAY}">앱 받기</a></nav></div></header>`;

const footer = `<footer class="foot"><div class="in">
<p><b>냥멍노트</b> · 반려동물 기록장·사진첩 · 재미 사주</p>
<p>몬타나 주식회사 · 대표 김석 · 사업자등록번호 148-87-01772 · 통신판매업 제2026-부산동래-0486호<br>부산광역시 동래구 쇠미로129번길 62-12, 106동 202호 · 010-8712-8635 · support@zzend.app</p>
<p><a href="../">냥멍노트 홈</a> · <a href="../privacy.html">개인정보처리방침</a> · <a href="../terms.html">이용약관</a> · <a href="../support.html">문의</a></p>
<p class="small">사주 풀이는 재미로 보는 콘텐츠예요. 과학적으로 검증된 내용이 아니며, 건강·행동 문제는 꼭 수의사와 상담하세요.</p>
</div></footer></body></html>`;

const org = { '@type': 'Organization', name: '몬타나 주식회사', url: SITE };
const fmt = d => d.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, dd) => `${y}년 ${+m}월 ${+dd}일`);
const card = p => `<a class="card" href="${p.slug}.html" data-cat="${p.category}"><span class="thumb t-${p.category}" aria-hidden="true">${p.emoji}</span><span class="txt"><em>${CATS[p.category]}</em><b>${esc(p.title)}</b><span>${esc(p.description)}</span><time datetime="${p.date}">${fmt(p.date)}</time></span></a>`;

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.html')) fs.rmSync(path.join(OUT, f));

for (const p of posts) {
  const url = BASE + p.slug + '.html';
  const related = (p.related || []).map(s => bySlug[s]).filter(Boolean);
  for (const q of posts) if (related.length < 3 && q !== p && !related.includes(q) && q.category === p.category) related.push(q);
  for (const q of posts) if (related.length < 3 && q !== p && !related.includes(q)) related.push(q);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description, datePublished: p.date, dateModified: p.updated, inLanguage: 'ko-KR', mainEntityOfPage: url, image: SITE + 'og.png', author: { '@type': 'Organization', name: '냥멍노트 편집팀', url: SITE }, publisher: { ...org, logo: { '@type': 'ImageObject', url: SITE + 'og-icon.png' } }, keywords: p.keyword },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '냥멍노트', item: SITE },
      { '@type': 'ListItem', position: 2, name: BLOG, item: BASE },
      { '@type': 'ListItem', position: 3, name: CATS[p.category], item: BASE + '#cat-' + p.category },
      { '@type': 'ListItem', position: 4, name: p.title, item: url }] },
  ];
  if (p.faq.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  const toc = [...p.body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(m => `<li><a href="#${m[1]}">${strip(m[2])}</a></li>`).join('');
  const html = head({ title: `${p.title} | ${BLOG}`, desc: p.description, url, type: 'article', ld }) + header + `
<main class="post"><div class="in">
<nav class="crumb" aria-label="현재 위치"><a href="../">냥멍노트</a> › <a href="./">블로그</a> › <a href="./#cat-${p.category}">${CATS[p.category]}</a></nav>
<article>
<p class="cat">${CATS[p.category]}</p>
<h1>${esc(p.title)}</h1>
<p class="meta">냥멍노트 편집팀 · <time datetime="${p.date}">${fmt(p.date)}</time>${p.updated !== p.date ? ` · 고침 <time datetime="${p.updated}">${fmt(p.updated)}</time>` : ''}</p>
${p.summary.length ? `<section class="sum"><h2 class="sum-h">30초 요약</h2><ul>${p.summary.map(s => `<li>${s}</li>`).join('')}</ul></section>` : ''}
${toc ? `<details class="toc" open><summary>목차</summary><ol>${toc}</ol></details>` : ''}
<div class="body">
${p.body}
</div>
${p.faq.length ? `<section class="faq"><h2 id="faq">자주 묻는 것</h2>${p.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>` : ''}
<aside class="editor"><img src="../og-icon.png" alt="" width="44" height="44"><div><b>냥멍노트 편집팀</b><p>반려동물 기록 앱 냥멍노트를 만드는 팀이에요. 사주 이야기는 재미로, 나이·건강 이야기는 공개된 수의학 자료를 바탕으로 씁니다. 틀린 곳은 support@zzend.app 으로 알려 주세요.</p></div></aside>
</article>
<section class="cta"><h2>우리 아이 생일, 앱에 넣어 두세요</h2><p>냥멍노트에 생일을 넣으면 함께한 날·사람 나이를 바로 보여 주고, 재미 사주 탭에서 생일로 보는 오늘의 한마디도 볼 수 있어요. 일기·몸무게·접종 기록은 휴대폰 안에만 저장돼요.</p>${stores}</section>
<section class="more"><h2>이어서 읽기</h2><div class="grid">${related.map(card).join('')}</div></section>
</div></main>` + footer;
  fs.writeFileSync(path.join(OUT, p.slug + '.html'), html);
}

// 목록
const tabs = `<div class="tabs" role="tablist"><button class="on" data-f="all">전체</button>${Object.entries(CATS).map(([k, v]) => `<button data-f="${k}" id="cat-${k}">${v}</button>`).join('')}</div>`;
const indexLd = [{ '@context': 'https://schema.org', '@type': 'Blog', name: BLOG, url: BASE, inLanguage: 'ko-KR', publisher: org,
  blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: BASE + p.slug + '.html', datePublished: p.date })) }];
fs.writeFileSync(path.join(OUT, 'index.html'), head({ title: `${BLOG} · 강아지·고양이 사주와 나이 이야기`, desc: '강아지·고양이 사주 보는 법, 사람 나이 계산법, 생일 모르는 아이의 생일 정하기까지. 반려동물 기록 앱 냥멍노트가 쓰는 블로그예요.', url: BASE, ld: indexLd }) + header + `
<main><section class="hero"><div class="in">
<p class="kicker">냥멍노트 블로그</p>
<h1>우리 아이 생일로 읽는<br>사주와 나이 이야기</h1>
<p class="lead">강아지·고양이 사주 보는 법부터 사람 나이 계산, 생일을 모를 때 정하는 법까지. 재미는 재미대로, 건강 이야기는 근거를 붙여 씁니다.</p>
${stores}
</div></section>
<section class="list"><div class="in">${tabs}<div class="grid" id="grid">${posts.map(card).join('')}</div></div></section></main>
<script>(function(){var b=document.querySelectorAll('.tabs button'),c=document.querySelectorAll('#grid .card');function f(k){b.forEach(function(x){x.classList.toggle('on',x.dataset.f===k)});c.forEach(function(x){x.hidden=!(k==='all'||x.dataset.cat===k)})}b.forEach(function(x){x.onclick=function(){f(x.dataset.f)}});var h=location.hash.replace('#cat-','');if(h&&document.getElementById('cat-'+h))f(h);})();</script>` + footer);

// 사이트맵 · robots (도메인 뿌리에 둘 robots 는 상위 폴더 몫이라 blog/ 안 것은 참고용)
const urls = [{ loc: BASE, lastmod: posts[0].updated }, ...posts.map(p => ({ loc: BASE + p.slug + '.html', lastmod: p.updated }))];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);
console.log(`글 ${posts.length}편 → ${OUT} (base ${BASE})`);
