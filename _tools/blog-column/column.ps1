# 냥멍 블로그 — 매일 칼럼 한 편 (제안 · 작업 스케줄러에 아직 등록하지 않았다)
#   .\column.ps1          글 쓰기 → 검사 → 커밋 → main 푸시(GitHub Pages) → 라이브 200 확인
#   .\column.ps1 -Test    빌드·검사만 (claude 안 부름 · 커밋·푸시 없음)
param([switch]$Test)

$Repo = "C:\petsaju-blog"
$Site = "https://petsaju.nibb.ink/blog/"   # 워커가 /blog 를 넘기기 전에는 github.io 주소로 확인한다
$Origin = "https://gimzimean.github.io/nyangmeong-saju/blog/"

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $Here "logs"; New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir ("column_{0}.log" -f (Get-Date -Format "yyyy-MM-dd_HHmm"))
function Say($m) { $l = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $m; Write-Output $l; Add-Content -Path $Log -Value $l -Encoding utf8 }

Set-Location $Repo
if ((git branch --show-current).Trim() -ne "main") { Say "STOP: main 이 아니다"; exit 2 }
git pull -q --ff-only origin main; if ($LASTEXITCODE) { Say "STOP: main 을 못 당겼다"; exit 2 }
if (@(git status --porcelain).Count) { Say "STOP: 커밋 안 된 변경이 있다 — 남의 작업일 수 있어 손대지 않는다"; exit 2 }

if ($Test) { node _tools/build-blog.mjs; node _tools/blog-check.mjs; $c = $LASTEXITCODE; git checkout -- . ; Say "test exit $c"; exit $c }

$claude = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claude) { $claude = "$env:USERPROFILE\.local\bin\claude.exe" }
$before = @(Get-ChildItem _blog_src -Filter *.html | ForEach-Object Name)
$instr = (Get-Content (Join-Path $Here "칼럼_지시.md") -Raw -Encoding utf8) + "`n`n(오늘 날짜(한국): $((Get-Date).ToUniversalTime().AddHours(9).ToString('yyyy-MM-dd')))"
Say "claude 쓰는 중"
& $claude -p $instr --permission-mode bypassPermissions 2>&1 | ForEach-Object { Add-Content -Path $Log -Value "    | $_" -Encoding utf8 }
$new = @(Get-ChildItem _blog_src -Filter *.html | ForEach-Object Name | Where-Object { $before -notcontains $_ })
function Revert($why) { Say "FAIL: $why"; git checkout -- . ; git clean -fdq -- _blog_src blog; exit 1 }
if ($new.Count -ne 1) { Revert "새 원본이 1개가 아니다 ($($new -join ', '))" }
node _tools/build-blog.mjs | Out-Null
node _tools/blog-check.mjs 2>&1 | ForEach-Object { Say $_ }
if ($LASTEXITCODE) { Revert "검사 실패" }

$slug = [IO.Path]::GetFileNameWithoutExtension($new[0])
git add -- _blog_src blog robots.txt _tools/blog-column/keywords.tsv
git commit -q -m "블로그 칼럼: $slug"
git push -q origin main; if ($LASTEXITCODE) { Say "FAIL: push"; exit 1 }
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep 30
  try { $r = Invoke-WebRequest -Uri ($Origin + "$slug.html") -UseBasicParsing -TimeoutSec 20; if ($r.StatusCode -eq 200) { Say "라이브 200 · $Site$slug.html"; exit 0 } } catch {}
}
Say "FAIL: 10분 안에 200 이 안 나왔다"; exit 1
