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
