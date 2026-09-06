const schema='oshilink_v2';
const clean=value=>String(value??'').trim();

export function buildRecruitment(fields){
  const title=clean(fields.title),region=clean(fields.region),concept=clean(fields.concept);
  const eventDate=clean(fields.eventDate)||null;
  if(!title)throw new Error('募集タイトルを入力してください。');
  if(title.length>120)throw new Error('募集タイトルは120文字以内で入力してください。');
  if(concept.length>1000)throw new Error('募集内容は1000文字以内で入力してください。');
  if(region.length>80)throw new Error('開催地域は80文字以内で入力してください。');
  return {title,region,concept,event_date:eventDate,is_public:false,is_open:true};
}

export async function saveRecruitment(client,recruitment){
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)throw new Error('募集を保存するにはログインしてください。');
  const db=client.schema(schema);
  const profileResult=await db.from('profiles').select('id').eq('owner_id',user.id).eq('kind','organizer').maybeSingle();
  if(profileResult.error||!profileResult.data)throw new Error('先に主催者プロフィールを保存してください。');
  const result=await db.from('recruitments').insert({...recruitment,owner_id:user.id,organizer_profile_id:profileResult.data.id}).select('id').single();
  if(result.error)throw new Error('出演者募集を保存できませんでした。入力内容をご確認ください。',{cause:result.error});
  return result.data;
}

export async function publishRecruitment(client,id){
  const result=await client.schema(schema).from('recruitments').update({is_public:true,is_open:true}).eq('id',id).select('id').single();
  if(result.error)throw new Error('出演者募集を公開できませんでした。',{cause:result.error});
  return result.data;
}

export async function setMatchingOpen(client,profileId,open){
  const {error}=await client.schema(schema).rpc('set_matching_open',{p_profile_id:profileId,p_open:Boolean(open)});
  if(error)throw new Error(open?'受付を開始できませんでした。プロフィールを公開し、XのURLを登録してください。':'受付を停止できませんでした。',{cause:error});
  return Boolean(open);
}

export async function sendRecruitmentInterest(client,recruitmentId){
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)throw new Error('興味を伝えるにはログインしてください。');
  const db=client.schema(schema);
  const profile=await db.from('profiles').select('id,is_public,matching_open,x_url').eq('owner_id',user.id).eq('kind','singer').maybeSingle();
  if(profile.error||!profile.data)throw new Error('歌い手プロフィールを作成してください。');
  if(!profile.data.is_public)throw new Error('先に歌い手プロフィールを公開してください。');
  if(!profile.data.x_url)throw new Error('歌い手プロフィールに公開XのURLを登録してください。');
  if(!profile.data.matching_open)throw new Error('マイページで歌い手のマッチング受付をONにしてください。');
  const result=await db.rpc('send_interest',{p_sender_profile_id:profile.data.id,p_recruitment_id:recruitmentId,p_target_profile_id:null});
  if(result.error)throw new Error('興味を送信できませんでした。送信上限または24時間の再送制限をご確認ください。',{cause:result.error});
  return result.data;
}

export async function sendProfileInterest(client,targetProfileId){
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)throw new Error('出演相談を送るにはログインしてください。');
  const db=client.schema(schema);
  const profile=await db.from('profiles').select('id,is_public,matching_open,x_url').eq('owner_id',user.id).eq('kind','organizer').maybeSingle();
  if(profile.error||!profile.data)throw new Error('主催者プロフィールを作成してください。');
  if(!profile.data.is_public)throw new Error('先に主催者プロフィールを公開してください。');
  if(!profile.data.x_url)throw new Error('主催者プロフィールに公開XのURLを登録してください。');
  if(!profile.data.matching_open)throw new Error('マイページで主催者のマッチング受付をONにしてください。');
  const result=await db.rpc('send_interest',{p_sender_profile_id:profile.data.id,p_recruitment_id:null,p_target_profile_id:targetProfileId});
  if(result.error)throw new Error('出演相談を送信できませんでした。送信上限または24時間の再送制限をご確認ください。',{cause:result.error});
  return result.data;
}

export async function loadMatchingDashboard(client){
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)throw new Error('マッチング情報を見るにはログインしてください。');
  const db=client.schema(schema);
  const [profilesResult,notificationsResult,interestsResult,sentResult]=await Promise.all([
    db.from('profiles').select('id,kind,display_name,is_public,matching_open,x_url').eq('owner_id',user.id).in('kind',['singer','organizer']),
    db.from('notifications').select('id,interest_id,read_at,created_at').order('created_at',{ascending:false}),
    db.from('interest_signals').select('id,sender_profile_id,direction,state,created_at').eq('recipient_id',user.id).order('created_at',{ascending:false}),
    db.from('interest_signals').select('id,direction,recruitment_id,target_profile_id,state,created_at').eq('sender_id',user.id).order('created_at',{ascending:false})
  ]);
  const failed=[profilesResult,notificationsResult,interestsResult,sentResult].find(result=>result.error);
  if(failed)throw new Error('マッチング情報を読み込めませんでした。',{cause:failed.error});
  const interests=interestsResult.data||[],senderIds=[...new Set(interests.map(item=>item.sender_profile_id))];
  let senders=[];
  if(senderIds.length){
    const senderResult=await db.from('profiles').select('id,display_name,x_url').in('id',senderIds);
    if(senderResult.error)throw new Error('通知した相手の情報を読み込めませんでした。',{cause:senderResult.error});
    senders=senderResult.data||[];
  }
  const interestById=new Map(interests.map(item=>[item.id,item])),senderById=new Map(senders.map(item=>[item.id,item]));
  const notifications=(notificationsResult.data||[]).map(item=>{
    const interest=interestById.get(item.interest_id),sender=interest?senderById.get(interest.sender_profile_id):null;
    return {...item,state:interest?.state||'unavailable',direction:interest?.direction||null,senderName:sender?.display_name||'確認できないユーザー',senderX:interest?.state==='active'?sender?.x_url||null:null};
  });
  const sent=sentResult.data||[],targetIds=[...new Set(sent.map(item=>item.target_profile_id).filter(Boolean))],recruitmentIds=[...new Set(sent.map(item=>item.recruitment_id).filter(Boolean))];
  const [targetsResult,recruitmentsResult]=await Promise.all([
    targetIds.length?db.from('profiles').select('id,display_name').in('id',targetIds):Promise.resolve({data:[],error:null}),
    recruitmentIds.length?db.from('recruitments').select('id,title').in('id',recruitmentIds):Promise.resolve({data:[],error:null})
  ]);
  if(targetsResult.error||recruitmentsResult.error)throw new Error('送信済み情報を読み込めませんでした。',{cause:targetsResult.error||recruitmentsResult.error});
  const targetNames=new Map((targetsResult.data||[]).map(item=>[item.id,item.display_name])),recruitmentNames=new Map((recruitmentsResult.data||[]).map(item=>[item.id,item.title]));
  return {profiles:profilesResult.data||[],notifications,sent:sent.map(item=>({...item,targetName:item.target_profile_id?targetNames.get(item.target_profile_id)||'歌い手プロフィール':recruitmentNames.get(item.recruitment_id)||'出演者募集'}))};
}

export async function markNotificationRead(client,id){
  const {error}=await client.schema(schema).from('notifications').update({read_at:new Date().toISOString()}).eq('id',id);
  if(error)throw new Error('通知を既読にできませんでした。',{cause:error});
}

export async function cancelInterest(client,id){
  const {error}=await client.schema(schema).rpc('cancel_interest',{p_interest_id:id});
  if(error)throw new Error('興味・出演相談を取り消せませんでした。',{cause:error});
}
