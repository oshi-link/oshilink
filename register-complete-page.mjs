import {supabase} from './supabase-client.mjs';
import {completeAccountRegistration} from './registration-complete.mjs';

const $=id=>document.getElementById(id);
let verified=false;

function syncAge(){
  $('complete-guardian').checked=false;
  $('complete-guardian-field').hidden=$('complete-age').value!=='teen';
}

$('complete-age').addEventListener('change',syncAge);

const {data,error}=await supabase.auth.getUser();
verified=!error&&Boolean(data?.user?.email_confirmed_at);
$('verification-status').textContent=verified
  ? 'メールアドレスを確認しました。登録後、マイページでプロフィールをまとめて設定できます。'
  : 'メール確認済みのログイン情報が見つかりません。確認URLを開き直すか、ログインしてください。';
$('complete-submit').disabled=!verified;

$('complete-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=$('complete-submit'),status=$('complete-status');
  button.disabled=true;status.textContent='登録を完了しています…';
  try{
    await completeAccountRegistration(supabase,{
      age:$('complete-age').value,
      guardian:$('complete-guardian').checked,
      terms:$('complete-terms').checked
    });
    status.dataset.state='success';status.textContent='登録が完了しました。マイページへ移動します。';
    location.assign('./mypage.html');
  }catch(cause){
    status.dataset.state='error';status.textContent=cause.message;
    button.disabled=!verified;
  }
});
