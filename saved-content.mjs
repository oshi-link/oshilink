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

export async function savedEventState(client,eventId){
  if(!uuid.test(eventId||''))return false;
  const user=await currentUser(client);
  return hasRow(client,'saved_events','event_id',eventId,user.id);
}

export function toggleSavedEvent(client,eventId){
  return toggleRow(client,{table:'saved_events',column:'event_id',id:eventId});
}
