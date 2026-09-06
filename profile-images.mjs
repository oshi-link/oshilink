import {prepareSelectedImage} from './local-image-preview.mjs?v=drag-1';
import {loadPublicImageUrls} from './public-images.mjs';

export async function saveSelectedProfileImages(client,form,profiles){
  const targets=new Map(profiles.map(profile=>[profile.kind,profile.id]));
  const ids=[...targets.values()];
  if(!ids.length)return 0;
  const refs=await client.schema('oshilink_v2').from('profile_images').select('profile_id,kind,object_name').in('profile_id',ids);
  if(refs.error)throw new Error('現在の画像情報を確認できませんでした。');
  const current=new Map((refs.data||[]).map(row=>[`${row.profile_id}:${row.kind}`,row.object_name]));
  let saved=0;
  for(const [role,targetId] of targets)for(const kind of ['avatar','cover']){
    const input=form.querySelector(`#${role}-${kind}-input`),file=input?.files?.[0];
    if(!file)continue;
    const prepared=await prepareSelectedImage(input,kind);
    const body=new FormData();body.set('file',prepared);body.set('targetId',targetId);body.set('kind',kind);body.set('expectedPath',current.get(`${targetId}:${kind}`)||'');
    const result=await client.functions.invoke('store-profile-image',{body});
    if(result.error||result.data?.saved!==true)throw new Error('画像を保存できませんでした。5MB以下のJPEG・PNG・WebPをお試しください。');
    saved++;
  }
  return saved;
}

export async function showSavedProfileImages(client,form,profiles){
  const items=profiles.flatMap(profile=>[{id:profile.id,kind:'avatar'},{id:profile.id,kind:'cover'}]);
  const urls=await loadPublicImageUrls(client,items);
  for(const profile of profiles)for(const kind of ['avatar','cover']){
    const url=urls[`${kind}:${profile.id}`];if(!url)continue;
    const frame=form.querySelector(`[data-role="${profile.kind}"] .local-image-${kind}`),image=frame?.querySelector('img'),placeholder=frame?.querySelector('span');
    if(!image)continue;image.src=url;image.style.objectFit='cover';image.style.objectPosition='50% 50%';image.style.transform='none';image.hidden=false;if(placeholder)placeholder.hidden=true;
  }
}
