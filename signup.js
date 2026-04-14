import { supabase } from "./supabase.js";

const form = document.getElementById("signupForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    message.textContent = "登録失敗: " + error.message;
    return;
  }

  message.textContent = "登録成功！ログインしてください";
});
