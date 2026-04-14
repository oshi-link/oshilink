import { signIn, signUp } from './auth.js';
import { getCurrentUser } from './supabase.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const messageBox = document.getElementById('messageBox');
const setMessage = (text, type='success') => messageBox.innerHTML = `<div class="alert ${type}">${text}</div>`;

(async () => { const user = await getCurrentUser().catch(() => null); if (user) location.href = './dashboard.html'; })();

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await signIn(document.getElementById('email').value.trim(), document.getElementById('password').value);
    location.href = './dashboard.html';
  } catch (error) { setMessage(`ログイン失敗: ${error.message}`, 'error'); }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await signUp(document.getElementById('signupEmail').value.trim(), document.getElementById('signupPassword').value, document.getElementById('signupDisplayName').value.trim());
    setMessage('登録しました。メール認証をONにしている場合は、届いたメールから認証してください。');
    signupForm.reset();
  } catch (error) { setMessage(`新規登録失敗: ${error.message}`, 'error'); }
});
