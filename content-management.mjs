export async function loadMyContent(client){
  if(!client?.auth?.getUser||!client?.schema)throw new TypeError('Supabase接続が必要です。');
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user)throw new Error('ログインが必要です。',{cause:error});
  const db=client.schema('oshilink_v2');
  const [profiles,videos,events]=await Promise.all([
    db.from('profiles').select('id,kind,display_name,is_public').order('created_at'),
    db.from('videos').select('id,title,is_public').order('created_at',{ascending:false}),
    db.from('events').select('id,title,event_date,region,venue,doors,starts,state,description,price_text,ticket_url,is_public').eq('creator_id',data.user.id).order('event_date',{ascending:false})
  ]);
  const failed=[profiles,videos,events].find(result=>result.error);
  if(failed)throw new Error('投稿一覧を取得できませんでした。',{cause:failed.error});
  const ownedEvents=events.data||[];
  const flyerByEvent=await loadOwnedEventFlyers(client,ownedEvents);
  return {profiles:profiles.data||[],videos:videos.data||[],events:ownedEvents.map(event=>({...event,...flyerByEvent[event.id]}))};
}

export async function loadOwnedEventFlyers(client,events){
  const ids=(events||[]).map(event=>event.id).filter(Boolean);
  if(!ids.length)return {};
  const references=await client.schema('oshilink_v2').from('event_images').select('event_id,object_name').in('event_id',ids);
  if(references.error)throw new Error('登録済みのフライヤー情報を取得できませんでした。',{cause:references.error});
  const result={};
  for(const reference of references.data||[]){
    result[reference.event_id]={has_flyer:true,flyer_url:null};
    const signed=await client.storage?.from('oshilink-v2-images').createSignedUrl(reference.object_name,3600);
    if(!signed?.error&&signed?.data?.signedUrl)result[reference.event_id].flyer_url=signed.data.signedUrl;
  }
  return result;
}

export async function setContentPublic(client,type,id,isPublic){
  if(!['profiles','videos'].includes(type))throw new TypeError('変更できない種類です。');
  const {data,error}=await client.schema('oshilink_v2').from(type).update({is_public:Boolean(isPublic)}).eq('id',id).select('id,is_public').single();
  if(error)throw new Error('公開状態を変更できませんでした。',{cause:error});
  return data;
}

export async function publishMyEvent(client,id){
  const {error}=await client.schema('oshilink_v2').rpc('publish_my_event',{p_event_id:id});
  if(error)throw new Error('ライブを公開できませんでした。',{cause:error});
  return {id,is_public:true};
}

export async function unpublishMyEvent(client,id){
  const {error}=await client.schema('oshilink_v2').rpc('unpublish_my_event',{p_event_id:id});
  if(error)throw new Error('ライブを非公開にできませんでした。',{cause:error});
  return {id,is_public:false};
}

export async function updateMyEvent(client,id,post){
  const {error}=await client.schema('oshilink_v2').rpc('update_my_event',{
    p_event_id:id,p_title:post.title,p_event_date:post.date,p_region:post.region,p_venue:post.venue,
    p_doors:post.doors,p_starts:post.starts,p_state:post.state,p_description:post.description,
    p_price_text:post.price,p_ticket_url:post.ticket
  });
  if(error)throw new Error('ライブを更新できませんでした。',{cause:error});
  return {saved:true,eventId:id,joined:false,updated:true};
}

export async function deleteMyEvent(client,id){
  const {error}=await client.schema('oshilink_v2').rpc('delete_my_event',{p_event_id:id});
  if(error)throw new Error(error.code==='23503'?'ほかの出演者が参加しているライブは削除できません。運営へご連絡ください。':'ライブを削除できませんでした。',{cause:error});
  return {id,deleted:true};
}
