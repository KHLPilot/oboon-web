# 브리핑 에디터 본문 이미지 업로드 및 재정렬 설계

- 작성일: 2026-04-08
- 대상: 브리핑 글 작성/수정 에디터
- 범위: 본문 이미지 삽입 UX 개선, 본문 이미지 블록 재정렬 지원

## 목표

브리핑 본문 이미지 삽입 방식을 URL 입력 기반에서 파일 업로드 기반으로 바꾼다. 작성자는 이미지 버튼 클릭, 파일 드래그앤드롭, 클립보드 붙여넣기로 본문 이미지를 넣을 수 있어야 한다. 삽입된 이미지는 본문 안에서 block 이미지로 취급하고, 문단 사이에서 드래그로 순서를 바꿀 수 있어야 한다.

## 비목표

- 워드처럼 텍스트 옆 자유 배치
- 이미지 캡션, 정렬, 리사이즈 UI
- 이미지 갤러리/슬라이더 블록
- 모바일 전용 재정렬 UX 최적화

## 현재 상태

- 본문 이미지 삽입은 [TiptapEditor.client.tsx](/Users/songzo/KHL_Pilot/oboon-web/features/briefing/components/TiptapEditor.client.tsx) 안에서 URL prompt를 띄운 뒤 `setImage({ src })`로 넣는다.
- 커버 이미지는 [PostEditor.client.tsx](/Users/songzo/KHL_Pilot/oboon-web/app/briefing/admin/posts/new/PostEditor.client.tsx) 안에서 파일 선택 후 `/api/r2/upload`에 업로드한다.
- 본문 이미지 업로드와 커버 이미지 업로드가 서로 다른 UX를 가지며, 작성자가 외부 URL을 직접 준비해야 한다.

## 요구사항

1. 본문 이미지 버튼을 누르면 URL prompt 대신 파일 선택창이 열린다.
2. 에디터에 이미지 파일을 드롭하면 업로드 후 현재 drop 위치에 삽입된다.
3. 클립보드 이미지 붙여넣기를 지원한다.
4. 본문 이미지는 block 이미지로 삽입된다.
5. 본문 이미지는 에디터 내부에서 드래그로 순서를 바꿀 수 있다.
6. 업로드 실패 시 사용자에게 오류를 보여준다.
7. 커버 이미지 업로드와 동일한 업로드 정책을 재사용한다.

## 사용자 경험

### 삽입

- 작성자가 툴바의 이미지 버튼을 누른다.
- 숨겨진 파일 입력이 열리고, 이미지 파일을 고른다.
- 업로드가 성공하면 현재 커서 위치에 이미지가 삽입된다.

### 드롭

- 작성자가 데스크톱에서 이미지 파일을 에디터 위로 드래그한다.
- 에디터는 drop 이벤트를 가로채고, 파일이면 업로드를 시작한다.
- 업로드가 끝나면 drop된 위치에 이미지 블록을 삽입한다.

### 붙여넣기

- 작성자가 클립보드 이미지를 붙여넣는다.
- paste 이벤트에서 이미지 파일을 추출한다.
- 업로드 후 현재 선택 위치에 이미지 블록을 삽입한다.

### 재정렬

- 삽입된 이미지는 block node이면서 draggable이다.
- 작성자는 이미지를 마우스로 잡아 위아래 문단 사이로 이동할 수 있다.
- 텍스트 옆 흐름 배치는 허용하지 않는다.

## 기술 설계

### 1. 업로드 함수 통합

[PostEditor.client.tsx](/Users/songzo/KHL_Pilot/oboon-web/app/briefing/admin/posts/new/PostEditor.client.tsx) 안의 커버 이미지 업로드 로직을 본문 이미지에서도 재사용 가능하게 분리한다.

예상 형태:

- `uploadBriefingImage(file: File): Promise<string>`
- 입력: 업로드할 이미지 파일
- 출력: 업로드된 공개 URL

이 함수는 아래 정보를 재사용한다.

- `uploadTempIdRef`
- `mode === "edit" && postId ? postId : uploadTempIdRef.current`
- `/api/r2/upload`
- `type=briefing-cover`

주의:

- API 쪽 타입명이 `briefing-cover`라도 저장 목적은 동일한 브리핑 이미지 업로드이므로 우선 재사용한다.
- 서버에서 본문 이미지와 커버 이미지를 구분해야 할 필요가 생기면 별도 `type` 추가는 후속 작업으로 둔다.

### 2. 에디터 API 확장

[TiptapEditor.client.tsx](/Users/songzo/KHL_Pilot/oboon-web/features/briefing/components/TiptapEditor.client.tsx)에 아래 prop을 추가한다.

- `onImageUpload?: (file: File) => Promise<string>`
- `onError?: (message: string) => void`

역할:

- 에디터는 파일 선택, drop, paste를 감지한다.
- 실제 업로드는 상위가 제공한 `onImageUpload`가 수행한다.
- 에디터는 업로드 결과 URL만 받아 이미지 블록을 삽입한다.

이 방식이 적합한 이유:

- 에디터를 저장소 구현 세부사항에서 분리할 수 있다.
- 현재 `PostEditorClient`가 이미 업로드 컨텍스트를 가지고 있다.
- 생성/수정 모드 모두 같은 업로드 함수를 사용할 수 있다.

### 3. 이미지 버튼 동작 변경

현재 `addImage`는 `window.prompt`로 URL을 받는다. 이를 제거하고 숨겨진 파일 입력을 연다.

구조:

- `imageInputRef` 추가
- 툴바 이미지 버튼 클릭 시 `imageInputRef.current?.click()`
- `onChange`에서 선택 파일을 받아 `onImageUpload` 실행
- 성공 시 `editor.chain().focus().setImage({ src: uploadedUrl }).run()`

### 4. drop/paste 처리

`editorProps.handleDrop`와 `editorProps.handlePaste`를 사용한다.

처리 규칙:

- 첫 번째 이미지 파일만 우선 처리한다.
- 파일이 이미지가 아니면 기본 동작을 유지한다.
- 이미지 파일이면 기본 동작을 막고 업로드를 실행한다.
- 업로드 완료 후 drop/paste 위치에 이미지를 삽입한다.

drop 위치 계산:

- drop 좌표 기반으로 selection을 옮긴 뒤 이미지 삽입
- Tiptap/ProseMirror view API가 허용하는 범위에서 가장 근접한 위치에 삽입

### 5. draggable block image

본문 이미지는 `Image.configure({ inline: false })`를 유지한다. 여기에 block 이미지 재정렬이 가능하도록 draggable 속성을 보강한다.

우선 구현 방식:

- 이미지 노드를 block으로 유지
- 노드 DOM에 `draggable="true"`가 반영되도록 설정
- ProseMirror 기본 node drag 동작을 사용

이 방식의 장점:

- 별도 정렬 모델을 만들지 않아도 된다.
- HTML 저장 형식을 그대로 유지할 수 있다.

제약:

- 워드식 자유 이동은 아니다.
- 드래그 경험은 데스크톱 우선이다.

### 6. 업로드 상태와 오류 처리

에디터에 간단한 업로드 상태를 추가한다.

- 업로드 중: 이미지 버튼 비활성화 가능
- 오류 시: 에디터 하단 또는 상위 폼 오류 문구 표시

우선순위:

- 업로드 중복 방지
- 실패 시 메시지 표시

추가 상태 문구는 최소로 유지한다.

## 저장 포맷

저장 포맷은 계속 HTML이다. 본문 이미지는 최종적으로 `<img src="...">`로 저장되며, 기존 상세 렌더러/세니타이저 체계를 유지한다.

영향:

- [sanitizeHtml.ts](/Users/songzo/KHL_Pilot/oboon-web/lib/briefing/sanitizeHtml.ts) 수정은 필수는 아니다.
- 현재 `img src`, `alt` 허용 범위 안에서 동작한다.

## 테스트 계획

### 회귀 테스트

[tests/briefing-rich-text-styles.test.mjs](/Users/songzo/KHL_Pilot/oboon-web/tests/briefing-rich-text-styles.test.mjs)에 아래 확인을 추가한다.

- URL prompt 제거
- 파일 업로드 prop 사용
- drop/paste 핸들러 연결
- 이미지 노드가 draggable block 흐름으로 설정됨

### 타입/기본 검증

- `pnpm typecheck`
- 기존 브리핑 관련 node 테스트

### 수동 검증

1. 새 글 작성에서 이미지 버튼 클릭 후 파일 선택
2. 이미지가 본문에 삽입되는지 확인
3. 이미지 파일 드래그앤드롭으로 삽입 확인
4. 클립보드 붙여넣기 삽입 확인
5. 이미지 블록을 위아래 문단 사이로 드래그 이동 확인
6. 저장 후 상세 페이지에서 이미지가 정상 렌더되는지 확인

## 구현 순서

1. `PostEditorClient`의 업로드 로직을 본문 이미지에서도 쓸 수 있게 정리
2. `TiptapEditor`에 `onImageUpload`, `onError` prop 추가
3. 이미지 버튼을 파일 입력 기반으로 교체
4. drop/paste 업로드 처리 추가
5. draggable block image 설정
6. 테스트 보강
7. 타입체크/브리핑 테스트 실행

## 리스크

### 드래그 재정렬 신뢰성

ProseMirror 기본 drag 동작은 커스텀 node view를 쓰지 않아도 작동할 수 있지만, 브라우저별 차이가 있을 수 있다. 우선 기본 동작으로 구현하고, 부족하면 후속으로 image node 확장 또는 node view를 도입한다.

### 업로드 중 중복 입력

드롭과 붙여넣기를 연속으로 빠르게 수행하면 중복 업로드가 생길 수 있다. 초기 버전에서는 단일 업로드 진행 중 추가 입력을 막는 정도로 제어한다.

### 모바일 UX

모바일에서는 드래그 재정렬 경험이 제한적일 수 있다. 이번 범위는 데스크톱 우선으로 둔다.

## 권장 결정

이번 구현은 다음 원칙을 따른다.

- URL prompt 제거
- 파일 업로드 단일 경로 사용
- block 이미지 + 드래그 재정렬
- 자유 배치/캡션/리사이즈는 제외

이 범위가 현재 요청과 기존 코드 구조 사이에서 가장 균형이 좋다.
