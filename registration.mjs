export const REGISTRATION_ENABLED=false;
export const REGISTRATION_TERMS_VERSION='terms-v1_privacy-v2';
export const CAPTCHA_ENABLED=true;
export const TURNSTILE_SITE_KEY='0x4AAAAAAEo4oLDgXBagWxAX';

export function validateRegistration(values){
  const age=String(values.age||'');
  if(age==='under13')throw new TypeError('13歳未満の方は会員登録できません。');
  if(!['teen','adult'].includes(age))throw new TypeError('年齢区分を選択してください。');
  if(age==='teen' && values.guardian!==true)throw new TypeError('保護者の同意を確認してください。');
  if(values.terms!==true)throw new TypeError('利用規約とプライバシー案内への同意が必要です。');
  const email=String(values.email||'').trim();
  if(!/^\S+@\S+\.\S+$/.test(email))throw new TypeError('メールアドレスを正しく入力してください。');
  const password=String(values.password||'');
  if(password.length<8)throw new TypeError('パスワードは8文字以上で入力してください。');
  return {age,email,password,guardian:age==='teen'};
}

export async function requestRegistration(client,values,redirectTo,captchaToken){
  if(!REGISTRATION_ENABLED)throw new Error('現在、会員登録は準備中です。');
  if(!CAPTCHA_ENABLED || !TURNSTILE_SITE_KEY)throw new Error('不正登録対策の設定が完了していません。');
  if(!String(captchaToken||'').trim())throw new TypeError('セキュリティ確認を完了してください。');
  if(!client?.auth?.signUp)throw new TypeError('Supabase接続が必要です。');
  const input=validateRegistration(values);
  const {data,error}=await client.auth.signUp({
    email:input.email,
    password:input.password,
    options:{emailRedirectTo:redirectTo,captchaToken:String(captchaToken).trim()}
  });
  if(error)throw new Error('確認メールを送信できませんでした。時間を置いて再度お試しください。',{cause:error});
  return data;
}
