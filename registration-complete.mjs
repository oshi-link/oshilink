import {REGISTRATION_TERMS_VERSION} from './registration.mjs';

const allowedKinds=new Set(['singer','organizer','listener']);

export function buildInitialProfiles(values,kinds){
  if(!Array.isArray(kinds)||kinds.length<1||kinds.length>3||new Set(kinds).size!==kinds.length)throw new TypeError('利用タイプを1〜3個選択してください。');
  return kinds.map(kind=>{
    if(!allowedKinds.has(kind))throw new TypeError('利用タイプが不正です。');
    const name=String(values[kind+'Name']||'').trim();
    if(!name)throw new TypeError('選択した利用タイプの名前を入力してください。');
    return {kind,display_name:name};
  });
}

export async function completeRegistration(client,{age,guardian,terms,profiles}){
  if(!client?.auth?.getUser||!client?.schema)throw new TypeError('Supabase接続が必要です。');
  const {data,error:authError}=await client.auth.getUser();
  if(authError||!data?.user?.email_confirmed_at)throw new Error('メールアドレスの確認が必要です。',{cause:authError});
  const ageBand=age==='teen'?'13_17':age==='adult'?'18_plus':null;
  if(!ageBand)throw new TypeError('年齢区分を選択してください。');
  if(ageBand==='13_17'&&guardian!==true)throw new TypeError('保護者の同意を確認してください。');
  if(terms!==true)throw new TypeError('利用規約とプライバシー案内への同意が必要です。');
  const {error}=await client.schema('oshilink_v2').rpc('complete_registration',{
    p_age_band:ageBand,
    p_guardian_consent:ageBand==='13_17',
    p_terms_accepted:true,
    p_terms_version:REGISTRATION_TERMS_VERSION,
    p_profiles:profiles
  });
  if(error)throw new Error('登録を完了できませんでした。再読み込み後も続く場合は運営へお問い合わせください。',{cause:error});
  return {completed:true};
}
