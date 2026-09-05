export const PASSWORD_EMAIL_ENABLED=true;

export function validateRecoveryEmail(value){
  const email=String(value||'').trim();
  if(!/^\S+@\S+\.\S+$/.test(email))throw new TypeError('メールアドレスを正しく入力してください。');
  return email;
}

export function validateNewPassword(password,confirmation){
  if(String(password||'').length<8)throw new TypeError('新しいパスワードは8文字以上で入力してください。');
  if(password!==confirmation)throw new TypeError('確認用パスワードが一致しません。');
  return password;
}

export async function requestPasswordRecovery(client,email,redirectTo,captchaToken){
  if(!PASSWORD_EMAIL_ENABLED)throw new Error('パスワード再設定メールは現在準備中です。');
  if(!String(captchaToken||'').trim())throw new TypeError('セキュリティ確認を完了してください。');
  if(!client?.auth?.resetPasswordForEmail)throw new TypeError('Supabase接続が必要です。');
  const {error}=await client.auth.resetPasswordForEmail(validateRecoveryEmail(email),{redirectTo,captchaToken:String(captchaToken).trim()});
  if(error)throw new Error('再設定メールを送信できませんでした。時間を置いて再度お試しください。',{cause:error});
}

export async function updatePassword(client,password,confirmation){
  if(!client?.auth?.getUser||!client?.auth?.updateUser)throw new TypeError('Supabase接続が必要です。');
  const next=validateNewPassword(password,confirmation);
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)throw new Error('再設定用のログイン情報を確認できません。メール内のURLをもう一度開いてください。',{cause:userError});
  const {error}=await client.auth.updateUser({password:next});
  if(error)throw new Error('パスワードを更新できませんでした。時間を置いて再度お試しください。',{cause:error});
}
