const allowedKinds=new Set(['singer','organizer','listener']);
const text=(value='')=>String(value).trim();
const optional=(value='')=>text(value)||null;

export function buildProfilePayload(values,selectedKinds){
  if(!Array.isArray(selectedKinds) || selectedKinds.length<1 || selectedKinds.length>3)throw new TypeError('1〜3種類の利用タイプが必要です。');
  if(new Set(selectedKinds).size!==selectedKinds.length || selectedKinds.some(kind=>!allowedKinds.has(kind)))throw new TypeError('利用タイプが不正です。');
  return selectedKinds.map(kind=>{
    const display_name=text(values[kind==='singer'?'singerName':kind==='organizer'?'organizerName':'listenerName']);
    if(!display_name)throw new TypeError('選択した利用タイプの名前が必要です。');
    const common={kind,display_name,bio:text(values.bio)};
    if(kind==='listener')return common;
    return {
      ...common,
      cover_message:text(values.cover),
      region:text(values[kind==='singer'?'singerRegion':'organizerRegion']),
      style:kind==='singer'?text(values.style):'',
      started_on:kind==='singer'?optional(values.started):null,
      brand:kind==='organizer'?text(values.brand):'',
      concept:kind==='organizer'?text(values.concept):'',
      x_url:optional(values.x),
      lp_url:optional(values.lp)
    };
  });
}

export async function saveMyProfiles(client,profiles){
  if(!client?.auth?.getUser || !client?.schema)throw new TypeError('Supabase接続が必要です。');
  const {data:authData,error:authError}=await client.auth.getUser();
  if(authError || !authData?.user)throw new Error('ログインが必要です。',{cause:authError});
  const {error}=await client.schema('oshilink_v2').rpc('save_my_profiles',{p_profiles:profiles});
  if(error)throw new Error('プロフィールを保存できませんでした。',{cause:error});
  return {saved:true,userId:authData.user.id};
}

export async function loadMyProfiles(client){
  if(!client?.auth?.getUser || !client?.schema)throw new TypeError('Supabase接続が必要です。');
  const {data:authData,error:authError}=await client.auth.getUser();
  if(authError || !authData?.user)throw new Error('ログインが必要です。',{cause:authError});
  const {data,error}=await client.schema('oshilink_v2').from('profiles')
    .select('kind,display_name,bio,cover_message,region,style,started_on,brand,concept,x_url,lp_url')
    .eq('owner_id',authData.user.id);
  if(error)throw new Error('保存済みのプロフィールを読み込めませんでした。',{cause:error});
  return data||[];
}

export function profileFormValues(profiles=[]){
  const byKind=Object.fromEntries(profiles.map(profile=>[profile.kind,profile]));
  const singer=byKind.singer||{};
  const organizer=byKind.organizer||{};
  const listener=byKind.listener||{};
  const shared=profiles.find(profile=>profile.kind==='singer')
    || profiles.find(profile=>profile.kind==='organizer')
    || profiles.find(profile=>profile.kind==='listener') || {};
  const creator=profiles.find(profile=>profile.kind==='singer')
    || profiles.find(profile=>profile.kind==='organizer') || {};
  return {
    kinds:profiles.map(profile=>profile.kind).filter(kind=>allowedKinds.has(kind)),
    values:{
      singerName:singer.display_name||'',started:singer.started_on||'',singerRegion:singer.region||'',style:singer.style||'',
      organizerName:organizer.display_name||'',brand:organizer.brand||'',organizerRegion:organizer.region||'',concept:organizer.concept||'',
      listenerName:listener.display_name||'',bio:shared.bio||'',cover:creator.cover_message||'',x:creator.x_url||'',lp:creator.lp_url||''
    }
  };
}
