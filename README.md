# 미루미

왜 미루는지 기록하는 To-Do 앱입니다. Google 로그인, Firestore 저장, 완료율 통계, 실패 원인 기록을 지원합니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Firebase 준비

1. Firebase Console에서 프로젝트를 만듭니다.
2. Authentication에서 Google 로그인을 켭니다.
3. Firestore Database를 만듭니다.
4. 프로젝트 설정에서 웹 앱을 추가하고 Firebase SDK 설정값을 복사합니다.
5. `.env.example`을 `.env.local`로 복사한 뒤 값을 채웁니다.
6. `.firebaserc.example`을 `.firebaserc`로 복사한 뒤 `YOUR_FIREBASE_PROJECT_ID`를 실제 프로젝트 ID로 바꿉니다.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 배포

```bash
npm run build
firebase deploy
```

Firebase Hosting은 `out` 폴더를 배포합니다. 배포 후 Firebase Authentication의 승인된 도메인에 배포 도메인이 들어있는지 확인하세요.

## GitHub 업로드

```bash
git init
git add .
git commit -m "Add Mirumi app"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Firestore 구조

`tasks` 컬렉션을 사용합니다.

- `uid`: 사용자 ID
- `title`: 할 일 제목
- `category`: 학업, 운동, 생활, 기타
- `deadline`: 마감일
- `status`: todo, done, failed
- `failureReasons`: 실패 원인 배열
- `createdAt`: 생성 시간
