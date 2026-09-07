const tagIds=new Map([
  ['透明感','clear'],['ハスキー','husky'],['低音','low'],['高音','high'],['やさしい','gentle'],
  ['力強い','powerful'],['ささやき系','whisper'],['爽やか','fresh'],['元気','energetic']
]);

const clean=value=>String(value||'').trim();

export function buildVideoPost(values){
  const title=clean(values.title);
  const videoUrl=clean(values.url);
  const description=clean(values.description);
  const selected=[].concat(values.tag||[]).filter(Boolean);
  if(!title)throw new TypeError('動画タイトルを入力してください。');
  if(!/^https:\/\/\S+$/.test(videoUrl))throw new TypeError('公開動画のURLを正しく入力してください。');
  if(description.length>1000)throw new TypeError('紹介文は1000文字以内で入力してください。');
  if(selected.length>5||new Set(selected).size!==selected.length)throw new TypeError('タグは重複なしで最大5個まで選択してください。');
  const tags=selected.map(label=>{
    const id=tagIds.get(label);
    if(!id)throw new TypeError('選択できないタグが含まれています。');
    return id;
  });
  return {title,videoUrl,description,tags};
}

export async function saveMyVideo(client,post){
  if(!client?.auth?.getUser||!client?.schema)throw new TypeError('Supabase接続が必要です。');
  const {data,error:authError}=await client.auth.getUser();
  if(authError||!data?.user)throw new Error('ログインが必要です。',{cause:authError});
  const {data:videoId,error}=await client.schema('oshilink_v2').rpc('create_my_video',{
    p_title:post.title,p_video_url:post.videoUrl,p_description:post.description,p_tag_ids:post.tags
  });
  if(error)throw new Error('歌ってみたを保存できませんでした。',{cause:error});
  return {saved:true,videoId};
}

const eventStates=new Map([['開催予定','scheduled'],['延期','postponed'],['中止','cancelled']]);
export function compactEventTitle(value){return clean(value).normalize('NFKC').toLowerCase().replace(/\s+/gu,'');}

export function buildLivePost(values){
  const post={title:clean(values.title),date:clean(values.date),region:clean(values.region),venue:clean(values.venue),doors:clean(values.doors)||null,starts:clean(values.time),state:eventStates.get(clean(values.status)),description:clean(values.description),price:clean(values.price),ticket:clean(values.ticket)||null};
  if(!post.title)throw new TypeError('イベント名を入力してください。');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(post.date))throw new TypeError('開催日を入力してください。');
  if(!post.region||!post.venue)throw new TypeError('開催地域と会場を入力してください。');
  if(!/^\d{2}:\d{2}$/.test(post.starts))throw new TypeError('開演時間を入力してください。');
  if(!post.state)throw new TypeError('開催状態を選択してください。');
  if(post.ticket&&!/^https:\/\/\S+$/.test(post.ticket))throw new TypeError('チケットURLを正しく入力してください。');
  return post;
}

export async function findEventCandidates(client,post){
  if(!client?.schema)return [];
  const {data,error}=await client.schema('oshilink_v2').from('events').select('id,title,event_date,region,venue,starts,state').eq('event_date',post.date).eq('title_key',compactEventTitle(post.title)).eq('venue',post.venue).eq('starts',post.starts).eq('is_public',true).eq('moderated_hidden',false);
  if(error)throw new Error('登録済みライブを確認できませんでした。',{cause:error});
  return data||[];
}

export async function saveMyEvent(client,post,existingEventId=null){
  if(!client?.auth?.getUser||!client?.schema)throw new TypeError('Supabase接続が必要です。');
  const {data,error:authError}=await client.auth.getUser();
  if(authError||!data?.user)throw new Error('ログインが必要です。',{cause:authError});
  const rpc=existingEventId?'join_my_event':'create_my_event';
  const args=existingEventId?{p_event_id:existingEventId}:{p_title:post.title,p_event_date:post.date,p_region:post.region,p_venue:post.venue,p_doors:post.doors,p_starts:post.starts,p_state:post.state,p_description:post.description,p_price_text:post.price,p_ticket_url:post.ticket};
  const {data:eventId,error}=await client.schema('oshilink_v2').rpc(rpc,args);
  if(error)throw new Error(existingEventId?'出演を追加できませんでした。':'ライブを保存できませんでした。',{cause:error});
  return {saved:true,eventId:eventId||existingEventId,joined:Boolean(existingEventId)};
}
