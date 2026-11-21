// 냥멍 블로그 검사기 — 빌드 결과(blog/)를 보고 하나라도 어기면 종료코드 1.
// node _tools/blog-check.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const OUT = path.join(ROOT, 'blog'), SRC = path.join(ROOT, '_blog_src');
const bad = [];
const BANNED = [/과학적으로 (증명|입증)된/, /100\s*%/, /반드시 (좋아|나아)/, /운명이 (정해|바뀌)/, /후기/, /만족도\s*\d/, /\d+\s*명이 (선택|이용)/, /!{2,}/, /효과 보장/, /치료(해|됩)/];
const srcs = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
const slugs = new Set(srcs.map(f => f.replace(/\.html$/, '')));
for (const f of srcs) {
  const s = fs.readFileSync(path.join(SRC, f), 'utf8');
  const slug = (s.match(/^slug:\s*(.+)$/m) || [])[1]?.trim();
  if (slug + '.html' !== f) bad.push(`${f}: 파일 이름과 slug 가 다르다`);
  if ((s.match(/^faq:/gm) || []).length < 3) bad.push(`${f}: 자주 묻는 것 3개 미만`);
  if ((s.match(/^summary:/gm) || []).length < 2) bad.push(`${f}: 30초 요약 2줄 미만`);
  if ((s.match(/<h2 id="/g) || []).length < 3) bad.push(`${f}: 소제목(h2 id) 3개 미만`);
  const body = s.split('-->')[1] || '';
  const text = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length < 1100) bad.push(`${f}: 본문이 짧다 (${text.length}자)`);
  if (!/^<p><b>/.test(body.trim())) bad.push(`${f}: 첫 문단이 굵은 답으로 시작하지 않는다`);
  for (const r of BANNED) if (r.test(body)) bad.push(`${f}: 금지 표현 ${r}`);
  if (/^category:\s*saju/m.test(s) && !/재미/.test(body)) bad.push(`${f}: 사주 글인데 '재미로 보는' 안내가 없다`);
}
for (const f of fs.readdirSync(OUT).filter(f => f.endsWith('.html'))) {
  const s = fs.readFileSync(path.join(OUT, f), 'utf8');
  if (!/<link rel="canonical" href="https:\/\/[^"]+">/.test(s)) bad.push(`blog/${f}: canonical 없음`);
  for (const m of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { bad.push(`blog/${f}: JSON-LD 깨짐`); } }
  for (const m of s.matchAll(/href="([a-z0-9-]+)\.html"/g)) if (!slugs.has(m[1])) bad.push(`blog/${f}: 없는 글로 가는 링크 ${m[1]}`);
  if (f !== 'index.html') {
    for (const t of ['"Article"', '"FAQPage"', '"BreadcrumbList"']) if (!s.includes(t)) bad.push(`blog/${f}: ${t} 없음`);
    if (!slugs.has(f.replace(/\.html$/, ''))) bad.push(`blog/${f}: 원본이 없는 고아 페이지`);
  }
}
const sm = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
for (const s of slugs) if (!sm.includes(`/${s}.html<`)) bad.push(`sitemap: ${s} 빠짐`);
if (bad.length) { console.log('검사 실패\n' + bad.map(b => ' - ' + b).join('\n')); process.exit(1); }
console.log(`검사 통과 · 글 ${slugs.size}편`);
