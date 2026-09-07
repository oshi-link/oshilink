export async function saveSelectedEventFlyer(client,eventId,input){
  const file=input?.files?.[0];
  if(!file)return {saved:false};
  if(!/^[0-9a-f-]{36}$/i.test(eventId||''))throw new TypeError('ライブ情報を保存してからフライヤーを登録してください。');
  const reference=await client.schema('oshilink_v2').from('event_images').select('object_name').eq('event_id',eventId).maybeSingle();
  if(reference.error)throw new Error('現在のフライヤー情報を確認できませんでした。');
  const body=new FormData();body.set('file',file);body.set('targetId',eventId);body.set('kind','flyer');body.set('expectedPath',reference.data?.object_name||'');
  const result=await client.functions.invoke('store-profile-image',{body});
  if(result.error||result.data?.saved!==true)throw new Error('フライヤーを保存できませんでした。10MB以下のJPEG・PNG・WebPをお試しください。');
  return {saved:true};
}
