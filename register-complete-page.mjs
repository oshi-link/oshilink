import {supabase} from './supabase-client.mjs';
import {buildInitialProfiles,completeRegistration} from './registration-complete.mjs';

const $=id=>document.getElementById(id);
let verified=false;
const roleNames={singer:'活動名',organizer:'主催者名',listener:'リスナー名'};

function syncAge(){
  $('complete-guardian').checked=false;
  $('complete-guardian-field').hidden=$('complete-age').value!=='teen';
}

function syncKinds(){
  const selected=[...document.querySelectorAll('.role-complete input:checked')].map(input=>input.value);
  $('initial-names').replaceChildren(...selected.map(kind=>{
    const label=document.createElement('label');label.className='field';label.textContent=roleNames[kind];
    const input=document.createElement('input');input.name=kind+'Name';input.required=true;input.maxLength=60;
    label.append(input);return label;
  }));
  $('complete-submit').disabled=!verified||selected.length===0;
}

$('complete-age').addEventListener('change',syncAge);
document.querySelectorAll('.role-complete input').forEach(input=>input.addEventListener('change',syncKinds));

const {data,error}=await supabase.auth.getUser();
verified=!error&&Boolean(data?.user?.email_confirmed_at);
$('verification-status').textContent=verified
  ? 'メールアドレスを確認しました。利用タイプと名前を設定してください。'
  : 'メール確認済みのログイン情報が見つかりません。確認URLを開き直すか、ログインしてください。';
syncKinds();

$('complete-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const button=$('complete-submit'),status=$('complete-status');
  button.disabled=true;status.textContent='登録を完了しています…';
  try{
    const kinds=[...document.querySelectorAll('.role-complete input:checked')].map(input=>input.value);
    const values=Object.fromEntries(new FormData(event.currentTarget));
    const profiles=buildInitialProfiles(values,kinds);
    await completeRegistration(supabase,{
      age:$('complete-age').value,
      guardian:$('complete-guardian').checked,
      terms:$('complete-terms').checked,
      profiles
    });
    status.dataset.state='success';status.textContent='登録が完了しました。マイページへ移動します。';
    location.assign('./mypage.html');
  }catch(cause){
    status.dataset.state='error';status.textContent=cause.message;
    syncKinds();
  }
});
