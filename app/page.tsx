"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every(Boolean);
}

function getFirebaseServices() {
  if (!hasFirebaseConfig()) {
    throw new Error("Firebase 설정값이 비어 있습니다. .env.local 파일을 채워주세요.");
  }

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}

type Status = "todo" | "done" | "failed";
type Task = {
  id: string;
  uid: string;
  title: string;
  category: string;
  deadline: string;
  status: Status;
  failureReasons: string[];
  createdAt?: unknown;
};

const categories = ["학업", "운동", "생활", "기타"];
const reasons = ["시간 부족", "컨디션 난조", "까먹음", "집중 방해", "귀찮음", "기타"];

const today = () => new Date().toISOString().slice(0, 10);
const percent = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const inDays = (date: string, days: number) => {
  const target = new Date(`${date}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(now.getDate() - days + 1);
  return target >= start && target <= now;
};

function Quokka({
  mood = "basic",
  small = false,
}: {
  mood?: "basic" | "smile" | "tear";
  small?: boolean;
}) {
  const src = mood === "tear" ? "/quokka-tear.png" : mood === "smile" ? "/quokka-smile.png" : "/quokka.png";

  return (
    <img
      src={src}
      alt="미루미 쿼카"
      className={`mx-auto shrink-0 object-contain ${small ? "h-16 w-16" : "h-32 w-32"}`}
    />
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"todo" | "stats">("todo");
  const [showAdd, setShowAdd] = useState(false);
  const [recording, setRecording] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", category: "학업", deadline: today() });
  const [result, setResult] = useState<Status>("done");
  const [picked, setPicked] = useState<string[]>([]);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!hasFirebaseConfig()) {
      setAuthError("Firebase 설정값이 필요합니다. .env.local 파일을 채운 뒤 다시 실행해주세요.");
      return undefined;
    }

    const { auth } = getFirebaseServices();
    getRedirectResult(auth).catch((error) => setAuthError(error.message));
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    const { db } = getFirebaseServices();
    return onSnapshot(query(collection(db, "tasks"), where("uid", "==", user.uid)), (snap) => {
      const next = snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Task);
      setTasks(next.sort((a, b) => a.deadline.localeCompare(b.deadline)));
    });
  }, [user]);

  const stats = useMemo(() => {
    const done = tasks.filter((task) => task.status === "done").length;
    const failed = tasks.filter((task) => task.status === "failed").length;
    const counted = done + failed;
    const week = tasks.filter((task) => task.status !== "todo" && inDays(task.deadline, 7));
    const month = tasks.filter((task) => task.status !== "todo" && inDays(task.deadline, 30));
    const counts = reasons
      .map((reason) => ({
        reason,
        count: tasks.filter((task) => task.failureReasons?.includes(reason)).length,
      }))
      .sort((a, b) => b.count - a.count);
    const top = counts[0];

    let feedback = "아직 기록이 적어요. 오늘 할 일부터 하나씩 기록해볼까요?";
    if (top?.count > 0) feedback = `${top.reason} 때문에 미룬 일이 가장 많았어요.`;
    if (percent(done, counted) >= 80) feedback = "완료율이 80% 이상이에요. 좋은 흐름입니다.";
    if (counted && percent(done, counted) <= 50) feedback = "완료율이 낮아요. 오늘 할 일을 조금 더 작게 나눠보세요.";
    if ((counts.find((item) => item.reason === "집중 방해")?.count || 0) >= Math.max(2, failed / 2)) {
      feedback = "집중 방해가 자주 보여요. 알림을 줄이고 짧은 집중 시간을 잡아보세요.";
    }

    return {
      done,
      failed,
      total: percent(done, counted),
      week: percent(week.filter((task) => task.status === "done").length, week.length),
      month: percent(month.filter((task) => task.status === "done").length, month.length),
      top,
      feedback,
    };
  }, [tasks]);

  const todayTasks = tasks.filter((task) => task.deadline === today());

  async function addTask() {
    if (!user || !form.title.trim()) return;

    const { db } = getFirebaseServices();
    await addDoc(collection(db, "tasks"), {
      ...form,
      title: form.title.trim(),
      status: "todo",
      failureReasons: [],
      uid: user.uid,
      createdAt: serverTimestamp(),
    });
    setForm({ title: "", category: "학업", deadline: today() });
    setShowAdd(false);
  }

  async function saveResult() {
    if (!recording) return;

    const { db } = getFirebaseServices();
    await updateDoc(doc(db, "tasks", recording.id), {
      status: result,
      failureReasons: result === "failed" ? picked : [],
    });
    setRecording(null);
    setPicked([]);
    setResult("done");
  }

  async function login() {
    setAuthError("");
    if (!hasFirebaseConfig()) {
      setAuthError("Firebase 설정값이 필요합니다. .env.local 파일을 채운 뒤 다시 실행해주세요.");
      return;
    }

    const { auth } = getFirebaseServices();
    const provider = new GoogleAuthProvider();
    provider.addScope("email");

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAuthError(message);
      if (message.toLowerCase().includes("popup")) await signInWithRedirect(auth, provider);
    }
  }

  async function logout() {
    const { auth } = getFirebaseServices();
    await signOut(auth);
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8df] p-6">
        <section className="w-full max-w-sm rounded-[28px] bg-[#fffdf4] p-8 text-center shadow-sm">
          <div className="mb-4 rounded-[26px] bg-[#fff1b8] p-5">
            <Quokka />
          </div>
          <h1 className="text-5xl font-black tracking-normal text-[#6b4a24]">미루미</h1>
          <p className="mt-4 text-[#8a7358]">왜 미루는지 기록하는 To-Do 앱</p>
          {authError && <p className="mt-5 rounded-2xl bg-[#fff4bf] p-3 text-sm text-[#8a4b20]">{authError}</p>}
          <button onClick={login} className="mt-8 w-full rounded-2xl bg-[#ffd75d] py-4 font-bold shadow-sm">
            Google로 시작하기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8df] px-4 py-5">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-md flex-col rounded-[30px] bg-[#fffdf4] shadow-sm ring-1 ring-[#f2dfba] md:max-w-3xl">
        <header className="flex items-center justify-between px-5 pt-6">
          <div>
            <p className="text-2xl font-black">안녕!</p>
            <p className="text-sm text-[#7b674e]">오늘도 미루미와 함께해요</p>
          </div>
          <button onClick={logout} className="rounded-xl border border-[#ead7ad] px-3 py-2 text-xs text-[#7b674e]">
            로그아웃
          </button>
        </header>

        <section className="flex-1 p-5 pb-24">
          {tab === "todo" ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">오늘 해야 할 일</h2>
                <Quokka />
              </div>
              <TaskList tasks={todayTasks} empty="오늘 마감인 일이 없어요." onPick={setRecording} />

              <h2 className="mb-3 mt-7 font-bold">전체 목록</h2>
              <TaskList tasks={tasks} empty="아직 할 일이 없어요." onPick={setRecording} />

              <button
                onClick={() => setShowAdd(true)}
                className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-[#ffd75d] text-3xl shadow md:right-[calc(50%-360px)]"
                aria-label="할 일 추가"
              >
                +
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-4 text-center text-xl font-black">통계</h2>
              <div className="space-y-4">
                <Stat title="전체 완료율" value={`${stats.total}%`} pct={stats.total} />
                <div className="grid grid-cols-2 gap-3">
                  <Box title="완료" value={`${stats.done}개`} />
                  <Box title="미완료" value={`${stats.failed}개`} />
                  <Box title="주간 완료율" value={`${stats.week}%`} />
                  <Box title="월간 완료율" value={`${stats.month}%`} />
                </div>
                <Box title="가장 많이 선택한 실패 원인" value={stats.top?.count ? `${stats.top.reason} (${stats.top.count}회)` : "아직 없음"} />
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-bold">미루미의 한마디</p>
                  <p className="text-sm text-[#6b4a24]">{stats.feedback}</p>
                </div>
              </div>
            </>
          )}
        </section>

        <nav className="fixed bottom-4 left-1/2 grid w-[calc(100%-32px)] max-w-md -translate-x-1/2 grid-cols-2 rounded-3xl bg-white p-2 shadow md:max-w-3xl">
          {(["todo", "stats"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-2xl py-3 font-bold ${tab === item ? "bg-[#ffd75d]" : "text-[#9a8568]"}`}
            >
              {item === "todo" ? "할 일" : "통계"}
            </button>
          ))}
        </nav>
      </div>

      {showAdd && (
        <Modal title="할 일 추가" onClose={() => setShowAdd(false)}>
          <label className="text-sm font-bold">
            제목
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="mt-2 w-full rounded-xl border border-[#ead7ad] p-3"
              placeholder="할 일을 입력하세요"
            />
          </label>
          <p className="mt-4 text-sm font-bold">카테고리</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setForm({ ...form, category })}
                className={`rounded-xl border p-3 ${form.category === category ? "bg-[#ffd75d]" : "bg-white"}`}
              >
                {category}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-sm font-bold">
            마감일
            <input
              type="date"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
              className="mt-2 w-full rounded-xl border border-[#ead7ad] p-3"
            />
          </label>
          <button onClick={addTask} className="mt-6 w-full rounded-2xl bg-[#ffd75d] py-4 font-bold">
            추가하기
          </button>
        </Modal>
      )}

      {recording && (
        <Modal title="결과 기록" onClose={() => setRecording(null)}>
          <div className="rounded-2xl bg-[#fff8df] p-4">
            <p className="font-bold">{recording.title}</p>
            <p className="text-xs text-[#8a7358]">마감일 · {recording.deadline}</p>
          </div>
          <p className="mt-4 text-sm font-bold">결과 선택</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => setResult("done")}
              className={`rounded-2xl border p-4 ${result === "done" ? "border-[#ffd75d] bg-[#fff4bf]" : "bg-white"}`}
            >
              <Quokka mood="smile" />
              완료
            </button>
            <button
              onClick={() => setResult("failed")}
              className={`rounded-2xl border p-4 ${result === "failed" ? "border-[#bed36d] bg-[#eef5c7]" : "bg-white"}`}
            >
              <Quokka mood="tear" />
              미완료
            </button>
          </div>
          {result === "failed" && (
            <>
              <p className="mt-4 text-sm font-bold">실패 원인 선택</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {reasons.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setPicked(picked.includes(reason) ? picked.filter((item) => item !== reason) : [...picked, reason])}
                    className={`rounded-xl border p-3 text-sm ${picked.includes(reason) ? "bg-[#ffd75d]" : "bg-white"}`}
                  >
                    {picked.includes(reason) ? "✓ " : ""}
                    {reason}
                  </button>
                ))}
              </div>
            </>
          )}
          <button onClick={saveResult} className="mt-6 w-full rounded-2xl bg-[#ffd75d] py-4 font-bold">
            기록하기
          </button>
        </Modal>
      )}
    </main>
  );
}

function TaskList({ tasks, empty, onPick }: { tasks: Task[]; empty: string; onPick: (task: Task) => void }) {
  return (
    <div className="space-y-3">
      {tasks.length === 0 && <p className="rounded-2xl bg-white p-5 text-center text-sm text-[#8a7358]">{empty}</p>}
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => onPick(task)}
          className={`w-full rounded-2xl border p-4 text-left ${
            task.status === "done"
              ? "border-[#ffe28a] bg-[#fff4bf]"
              : task.status === "failed"
                ? "border-[#c9dc80] bg-[#eef5c7]"
                : "border-[#ead7ad] bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-[#b8a58b] bg-white text-xs">
              {task.status === "done" ? "✓" : task.status === "failed" ? "!" : ""}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{task.title}</p>
              <p className="text-xs text-[#8a7358]">
                {task.category} · {task.deadline}
              </p>
            </div>
            {task.status !== "todo" && <Quokka small mood={task.status === "failed" ? "tear" : "smile"} />}
          </div>
        </button>
      ))}
    </div>
  );
}

function Box({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs text-[#8a7358]">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Stat({ title, value, pct }: { title: string; value: string; pct: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-2 text-4xl font-black">{value}</p>
      <div className="mt-3 h-3 rounded-full bg-[#f3e7c6]">
        <div className="h-3 rounded-full bg-[#ffd75d]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-10 bg-black/20 p-4">
      <div className="mx-auto mt-8 max-w-md rounded-3xl bg-[#fffdf4] p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button onClick={onClose} className="rounded-xl border px-3 py-1">
            닫기
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
