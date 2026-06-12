# 미루미 배포 체크리스트

## 1. Firebase 설정값 넣기

`.env.example`을 복사해서 `.env.local` 파일을 만들고 Firebase 웹 앱 설정값을 넣습니다.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 2. Firebase 프로젝트 연결

`.firebaserc.example`을 복사해서 `.firebaserc` 파일을 만들고 프로젝트 ID를 넣습니다.

```json
{
  "projects": {
    "default": "실제_FIREBASE_PROJECT_ID"
  }
}
```

## 3. 로컬 확인

```bash
npm install
npm run dev
```

## 4. 배포

```bash
npm run build
firebase deploy
```

## 5. GitHub 업로드

```bash
git init
git add .
git commit -m "Add Mirumi app"
git branch -M main
git remote add origin GitHub_저장소_URL
git push -u origin main
```

## 지금 프로젝트에 들어간 것

- 깨진 한글 UI 복구
- Firebase Auth Google 로그인
- Firestore 할 일 저장
- 오늘 할 일/전체 목록
- 완료/미완료 기록
- 실패 원인 통계
- Firebase Hosting 설정
- Firestore 보안 규칙
