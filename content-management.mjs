export async function loadMyContent(client){
  if(!client?.auth?.getUser||!client?.schema)throw new TypeError('Supabase接続が必要です。');
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user)throw new Error('ログインが必要です。',{cause:error});
  const db=client.schema('oshilink_v2');
  const [profiles,videos,events]=await Promise.all([
    db.from('profiles').select('id,kind,display_name,is_public').order('created_at'),
    db.from('videos').select('id,title,is_public').order('created_at',{ascending:false}),
    db.from('events').select('id,title,event_date,is_public').eq('creator_id',data.user.id).order('event_date',{ascending:false})
  ]);
  const failed=[profiles,videos,events].find(result=>result.error);
  if(failed)throw new Error('投稿一覧を取得できませんでした。',{cause:failed.error});
  return {profiles:profiles.data||[],videos:videos.data||[],events:events.data||[]};
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
