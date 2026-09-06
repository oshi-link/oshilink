const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function currentUser(client){
  const {data,error}=await client.auth.getUser();
  if(error)throw new Error('ログイン状態を確認できませんでした。');
  if(!data?.user?.id)throw new Error('保存するにはログインしてください。');
  return data.user;
}

async function hasRow(client,table,column,id,userId){
  const {data,error}=await client.schema('oshilink_v2').from(table)
    .select(column).eq('user_id',userId).eq(column,id).maybeSingle();
  if(error)throw new Error('保存状態を確認できませんでした。');
  return Boolean(data);
}

async function toggleRow(client,{table,column,id}){
  if(!uuid.test(id||''))throw new Error('対象が見つかりません。');
  const user=await currentUser(client);
  const active=await hasRow(client,table,column,id,user.id);
  const query=active
    ? client.schema('oshilink_v2').from(table).delete().eq('user_id',user.id).eq(column,id)
    : client.schema('oshilink_v2').from(table).insert({user_id:user.id,[column]:id});
  const {error}=await query;
  if(error)throw new Error(active?'保存を解除できませんでした。':'保存できませんでした。');
  return !active;
}

export async function favoriteState(client,profileId){
  if(!uuid.test(profileId||''))return false;
  const user=await currentUser(client);
  return hasRow(client,'favorites','profile_id',profileId,user.id);
}

export function toggleFavorite(client,profileId){
  return toggleRow(client,{table:'favorites',column:'profile_id',id:profileId});
}

export async function loadFavoriteProfileIds(client){
  const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError||!session?.user?.id)return [];
  const {data,error}=await client.schema('oshilink_v2').from('favorites').select('profile_id').eq('user_id',session.user.id);
  if(error)throw new Error('お気に入り情報を読み込めませんでした。',{cause:error});
  return (data||[]).map(row=>row.profile_id).filter(id=>uuid.test(id));
}

export function prioritizeFavoriteProfiles(profiles,favoriteIds,random=Math.random){
  const favorites=new Set(favoriteIds||[]);
  return [...(profiles||[])].map((profile,index)=>({profile,index,score:random()})).sort((a,b)=>
    Number(favorites.has(b.profile.id))-Number(favorites.has(a.profile.id))||a.score-b.score||a.index-b.index
  ).map(item=>item.profile);
}

export async function savedEventState(client,eventId){
  if(!uuid.test(eventId||''))return false;
  const user=await currentUser(client);
  return hasRow(client,'saved_events','event_id',eventId,user.id);
}

export function toggleSavedEvent(client,eventId){
  return toggleRow(client,{table:'saved_events',column:'event_id',id:eventId});
}
