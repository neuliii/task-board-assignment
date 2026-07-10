## 배포링크

- Cloudflare

```bash
https://task-board-assignment.pages.dev/
```

## 실행 방법

```bash
npm install
npm run dev

# 테스트
npm run test

# 빌드
npm run build
```

## 구현 여부 및 미구현 사유

### 미구현 기능

#### Priority 2

- 409 충돌 처리 UX
- 실패 요청 자동 재시도 및 백오프
- 다중 탭 동기화
- 키보드 접근성
- 검색 디바운싱 및 다중 필터

#### 미구현 사유

제한된 개발 시간 내에는 Priority 1 요구사항을 안정적으로 완성하는 것을 우선순위로 두었습니다.

특히 낙관적 업데이트, Rollback, Race Condition 처리, CRUD, 대량 데이터 렌더링 최적화 및 테스트를 우선 구현하여 핵심 요구사항의 완성도를 높였습니다.

## 기술 스택

- React 18
- TypeScript (strict)
- Vite
- Vitest
- MSW (Mock Service Worker)
- Zustand
- @tanstack/react-virtual