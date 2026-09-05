import {supabase} from './supabase-client.mjs';
import {CAPTCHA_ENABLED,REGISTRATION_ENABLED,TURNSTILE_SITE_KEY,requestRegistration} from './registration.mjs';
import {mountTurnstile} from './turnstile.mjs';
import {PASSWORD_EMAIL_ENABLED,requestPasswordRecovery} from './password-recovery.mjs';

const byId = id => document.getElementById(id);
function showPanel(mode) {
  for (const name of ['signup', 'login']) {
    byId(`${name}-panel`).hidden = name !== mode;
    byId(`${name}-tab`).setAttribute('aria-pressed', String(name === mode));
  }
}
byId('signup-tab').addEventListener('click', () => showPanel('signup'));
byId('login-tab').addEventListener('click', () => showPanel('login'));
byId('age').addEventListener('change', () => {
  const age = byId('age').value;
  byId('guardian').checked = false;
  byId('guardian-field').hidden = age !== 'teen';
  byId('age-notice').textContent = age === 'under13'
    ? '13歳未満の方は会員登録できません。登録せずに歌い手やライブの情報をご覧いただけます。'
    : '';
});
const signupButton=byId('signup-submit');
let captchaToken='';
const registrationReady=REGISTRATION_ENABLED&&CAPTCHA_ENABLED&&Boolean(TURNSTILE_SITE_KEY);
signupButton.disabled=!registrationReady;
signupButton.textContent=REGISTRATION_ENABLED?'確認メールを送信':'確認メールを送信（準備中）';
if(registrationReady){
  byId('captcha-wrap').hidden=false;
  signupButton.disabled=true;
  mountTurnstile({container:'#turnstile-widget',sitekey:TURNSTILE_SITE_KEY,onToken:token=>{captchaToken=token;signupButton.disabled=!token;},onUnavailable:()=>{byId('captcha-status').textContent='セキュリティ確認を読み込めませんでした。再読み込みしてください。';}});
}
byId('signup-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const status=byId('signup-status');
  const values={
    age:byId('age').value,
    guardian:byId('guardian').checked,
    terms:byId('terms-consent').checked,
    email:byId('signup-email').value,
    password:byId('signup-password').value
  };
  signupButton.disabled=true;
  status.textContent='確認メールを送信しています…';
  try{
    await requestRegistration(supabase,values,new URL('./register-complete.html',location.href).href,captchaToken);
    status.dataset.state='success';
    status.textContent='確認メールをご確認ください。メール内のURLから登録を続けてください。';
  }catch(error){
    status.dataset.state='error';
    status.textContent=error.message;
    signupButton.disabled=!registrationReady||!captchaToken;
  }
});
if (location.hash === '#login') showPanel('login');

const loginForm=byId('login-form');
const loginButton=byId('login-submit');
const loginStatus=byId('login-status');
let loginCaptchaToken='';
loginButton.disabled=true;
mountTurnstile({container:'#login-turnstile-widget',sitekey:TURNSTILE_SITE_KEY,onToken:token=>{loginCaptchaToken=token;loginButton.disabled=!token;},onUnavailable:()=>{byId('login-captcha-status').textContent='セキュリティ確認を読み込めませんでした。';}});

loginForm.addEventListener('submit',async event=>{
  event.preventDefault();
  loginButton.disabled=true;
  loginStatus.dataset.state='';
  loginStatus.textContent='ログインしています…';
  const email=byId('login-email').value.trim();
  const password=byId('login-password').value;
  let error;
  try{
    ({error}=await supabase.auth.signInWithPassword({email,password,options:{captchaToken:loginCaptchaToken}}));
  }catch(cause){
    error=cause;
  }
  if(error){
    loginStatus.dataset.state='error';
    loginStatus.textContent='ログインできませんでした。メールアドレス、パスワード、メール確認状況をご確認ください。';
    loginButton.disabled=!loginCaptchaToken;
    return;
  }
  loginStatus.dataset.state='success';
  loginStatus.textContent='ログインしました。マイページへ移動します。';
  location.assign('./mypage.html');
});

const {data:{session}}=await supabase.auth.getSession();
if(session){
  loginStatus.dataset.state='success';
  loginStatus.textContent='ログイン済みです。マイページへ進めます。';
}

const recoveryButton=byId('recovery-submit');
recoveryButton.disabled=!PASSWORD_EMAIL_ENABLED;
let recoveryCaptchaToken='';
if(PASSWORD_EMAIL_ENABLED){byId('recovery-captcha-wrap').hidden=false;mountTurnstile({container:'#recovery-turnstile-widget',sitekey:TURNSTILE_SITE_KEY,onToken:token=>{recoveryCaptchaToken=token;recoveryButton.disabled=!token;},onUnavailable:()=>{byId('recovery-message').textContent='セキュリティ確認を読み込めませんでした。';}});}
byId('recovery-form').addEventListener('submit',async event=>{event.preventDefault();const message=byId('recovery-message');recoveryButton.disabled=true;message.textContent='送信しています…';try{await requestPasswordRecovery(supabase,byId('recovery-email').value,new URL('./reset-password.html',location.href).href,recoveryCaptchaToken);message.textContent='該当するアカウントがある場合、再設定メールを送信しました。';}catch(error){message.textContent=error.message;recoveryButton.disabled=!PASSWORD_EMAIL_ENABLED||!recoveryCaptchaToken;}});
