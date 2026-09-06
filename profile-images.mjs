export async function saveSelectedProfileImages(client,form,profiles){
  const targets=new Map(profiles.map(profile=>[profile.kind,profile.id]));
  const ids=[...targets.values()];
  if(!ids.length)return 0;
  const refs=await client.schema('oshilink_v2').from('profile_images').select('profile_id,kind,object_name').in('profile_id',ids);
  if(refs.error)throw new Error('現在の画像情報を確認できませんでした。');
  const current=new Map((refs.data||[]).map(row=>[`${row.profile_id}:${row.kind}`,row.object_name]));
  let saved=0;
  for(const [role,targetId] of targets)for(const kind of ['avatar','cover']){
    const file=form.querySelector(`#${role}-${kind}-input`)?.files?.[0];
    if(!file)continue;
    const body=new FormData();body.set('file',file);body.set('targetId',targetId);body.set('kind',kind);body.set('expectedPath',current.get(`${targetId}:${kind}`)||'');
    const result=await client.functions.invoke('store-profile-image',{body});
    if(result.error||result.data?.saved!==true)throw new Error('画像を保存できませんでした。5MB以下のJPEG・PNG・WebPをお試しください。');
    saved++;
  }
  return saved;
}
