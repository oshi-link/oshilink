const stateLabels={scheduled:'開催予定',postponed:'延期',cancelled:'中止'};
export async function loadPublicData(client){
  if(!client?.schema)throw new TypeError('Supabase接続が必要です。');
  const db=client.schema('oshilink_v2');
  const [profilesResult,eventsResult,performancesResult,videosResult,tagsResult,videoTagsResult]=await Promise.all([
    db.from('profiles').select('id,kind,display_name,bio,region,style,cover_message,x_url,lp_url').eq('kind','singer').eq('is_public',true).eq('moderated_hidden',false),
    db.from('events').select('id,title,event_date,region,venue,starts,state,description,price_text,ticket_url,flyer_path').eq('is_public',true).eq('moderated_hidden',false),
    db.from('performances').select('event_id,profile_id'),
    db.from('videos').select('id,profile_id,title,video_url,description').eq('is_public',true).eq('moderated_hidden',false),
    db.from('voice_tags').select('id,label').eq('active',true),
    db.from('video_tags').select('video_id,tag_id,position').order('position')
  ]);
  const failed=[profilesResult,eventsResult,performancesResult,videosResult,tagsResult,videoTagsResult].find(result=>result.error);
  if(failed)throw new Error('公開情報を読み込めませんでした。',{cause:failed.error});
  const profiles=profilesResult.data||[],profileById=new Map(profiles.map(profile=>[profile.id,profile]));
  const performersByEvent=new Map();
  for(const performance of performancesResult.data||[]){const profile=profileById.get(performance.profile_id);if(profile){const list=performersByEvent.get(performance.event_id)||[];list.push({id:profile.id,name:profile.display_name});performersByEvent.set(performance.event_id,list);}}
  const labelById=new Map((tagsResult.data||[]).map(tag=>[tag.id,tag.label])),tagsByVideo=new Map();
  for(const row of videoTagsResult.data||[]){if(labelById.has(row.tag_id)){const list=tagsByVideo.get(row.video_id)||[];list.push(labelById.get(row.tag_id));tagsByVideo.set(row.video_id,list);}}
  const events=(eventsResult.data||[]).map(event=>({id:event.id,title:event.title,date:event.event_date,region:event.region,time:String(event.starts).slice(0,5),venue:event.venue,status:stateLabels[event.state]||event.state,performers:(performersByEvent.get(event.id)||[]).map(p=>p.name),performerLinks:performersByEvent.get(event.id)||[],description:event.description,price:event.price_text,ticket:event.ticket_url,public:true,poster:null}));
  const videos=(videosResult.data||[]).filter(video=>profileById.has(video.profile_id)).map(video=>({id:video.id,title:video.title,url:video.video_url,description:video.description,voice:profileById.get(video.profile_id).display_name,profileId:video.profile_id,tags:tagsByVideo.get(video.id)||[]}));
  return {profiles,events,videos,tags:(tagsResult.data||[]).map(tag=>tag.label)};
}
