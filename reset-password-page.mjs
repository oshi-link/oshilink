import {supabase} from './supabase-client.mjs';
import {updatePassword} from './password-recovery.mjs';
const byId=id=>document.getElementById(id);
const button=byId('new-password-submit');
const status=byId('recovery-status');
const {data:{user}}=await supabase.auth.getUser();
button.disabled=!user;
if(user)status.textContent='新しいパスワードを入力してください。';
byId('new-password-form').addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;status.textContent='変更しています…';try{await updatePassword(supabase,byId('new-password').value,byId('new-password-confirmation').value);status.textContent='パスワードを変更しました。ログイン画面へ戻ります。';setTimeout(()=>location.assign('./account.html#login'),1200);}catch(error){status.textContent=error.message;button.disabled=!user;}});
