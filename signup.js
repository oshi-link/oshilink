import { supabase } from "./supabase.js";

const signupForm = document.getElementById("signupForm");
const message = document.getElementById("message");
const submitButton = signupForm?.querySelector('button[type="submit"]');

function setMessage(text, isError = false) {
  if (!message) return;
  message.textContent = text;
  message.style.color = isError ? "#ff8ea1" : "#7CFC9A";
}

signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setMessage("メールアドレスとパスワードを入力してください。", true);
    return;
  }

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "登録中...";
    }

    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      throw error;
    }

    signupForm.reset();

    setMessage("新規登録が完了しました。確認メールが届いている場合は、認証後にログインしてください。");

    console.log("新規登録成功", data);
  } catch (error) {
    console.error("新規登録失敗:", error);
    setMessage(`新規登録に失敗しました: ${error.message}`, true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "登録する";
    }
  }
});
