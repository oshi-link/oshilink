import { supabase } from "./supabase.js";

const loginForm = document.getElementById("loginForm");
const signupBtn = document.getElementById("signupBtn");
const message = document.getElementById("message");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

function setMessage(text, isError = false) {
  if (!message) return;
  message.textContent = text;
  message.style.color = isError ? "#ff8ea1" : "#d7c2ff";
}

async function handleLogin(e) {
  e.preventDefault();
  setMessage("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setMessage("メールアドレスとパスワードを入力してください。", true);
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("ログイン失敗:", error);
    setMessage("ログインに失敗しました。入力内容をご確認ください。", true);
    return;
  }

  setMessage("ログインしました。ダッシュボードへ移動します。");
  location.href = "dashboard.html";
}

async function handleSignup() {
  setMessage("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setMessage("新規登録するには、先にメールアドレスとパスワードを入力してください。", true);
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error("新規登録失敗:", error);
    setMessage(`新規登録に失敗しました: ${error.message}`, true);
    return;
  }

  setMessage("新規登録が完了しました。確認メールが届いた場合は認証後にログインしてください。");
}

loginForm?.addEventListener("submit", handleLogin);
signupBtn?.addEventListener("click", handleSignup);
