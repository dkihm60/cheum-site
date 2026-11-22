"""horizontal.html(가로 보기)에서 index.html(세로 보기)을 만든다.

두 보기는 같은 16장의 페이지를 쓰고 배치 방향만 다르다.
내용을 고칠 때는 horizontal.html만 고친 뒤 이 스크립트를 실행한다:
    python3 tools/build_vertical.py
"""
import os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(root, 'horizontal.html'), encoding='utf-8').read()

R = [
    ('<title>주식회사 채움 | 가로로 보기</title>',
     '<title>주식회사 채움 | 아파트 특판가구 · 주방가구 · 시스템가구</title>'),
    ('지명원을 넘기듯 좌우로 보는 회사 소개.', '설계부터 생산, 현장 시공까지 직접 책임지는 경기도 안성의 가구 제조 기업.'),
    ('<link rel="canonical" href="https://www.cheum56.com/horizontal.html">',
     '<link rel="canonical" href="https://www.cheum56.com/">'),
    ('<body class="h-mode">', '<body class="h-mode v-mode">'),
    ('<a href="index.html" title="세로로 보기">', '<a href="index.html" aria-current="page" title="세로로 보기">'),
    ('<a href="horizontal.html" aria-current="page" title="가로로 보기">', '<a href="horizontal.html" title="가로로 보기">'),
    ('휠을 한 번 굴리거나 → 를 누르면 다음 페이지로 넘어갑니다', '휠을 한 번 굴리거나 ↓ 를 누르면 다음 페이지로 넘어갑니다'),
    ('<span class="h-help">휠 한 번 · ← → 한 번 = 한 페이지</span>', '<span class="h-help">휠 한 번 · ↑ ↓ 한 번 = 한 페이지</span>'),
    ('aria-label="이전 페이지">←</button>', 'aria-label="이전 페이지">↑</button>'),
    ('aria-label="다음 페이지">→</button>', 'aria-label="다음 페이지">↓</button>'),
]
for a, b in R:
    if a not in s:
        raise SystemExit('찾을 수 없음: ' + a)
    s = s.replace(a, b)

open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(s)
print('index.html 생성 완료')
