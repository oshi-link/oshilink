import {dateKey,monthCells,filterVideos,upcomingRegions} from './calendar.mjs?v=regions-1';
import {samplePoster,mountPosterCarousel} from './posters.mjs?v=event-display-1';
import {supabase} from './supabase-client.mjs';
import {loadPublicData} from './public-data.mjs?v=event-display-1';
import {savedEventState,toggleSavedEvent,loadFavoriteProfileIds,prioritizeFavoriteProfiles} from './saved-content.mjs';
import {sendRecruitmentInterest} from './matching.mjs';
const $=id=>document.getElementById(id);
const demoMode=new URLSearchParams(location.search).get('demo')==='1';
if(demoMode){$('demo-control').hidden=false;$('demo').checked=true;}
const now=new Date();let year=now.getFullYear(),month=now.getMonth(),selected=dateKey(year,month,now.getDate());
const baseMonth=month,baseYear=year;
const events=[{id:'sample-a',title:'ABCライブ',date:dateKey(baseYear,baseMonth,now.getDate()),region:'東京都',time:'18:00',venue:'サンプル会場 A',performers:['歌い手 A','歌い手 B'],status:'開催予定'},{id:'sample-b',title:'アコースティック・ステージ',date:dateKey(baseYear,baseMonth,Math.min(now.getDate()+3,new Date(baseYear,baseMonth+1,0).getDate())),region:'大阪府',time:'17:30',venue:'サンプル会場 B',performers:['歌い手 C'],status:'開催予定'},{id:'sample-c',title:'オンライン歌枠ライブ',date:dateKey(baseYear,baseMonth,Math.min(now.getDate()+7,new Date(baseYear,baseMonth+1,0).getDate())),region:'オンライン',time:'20:00',venue:'配信会場（サンプル）',performers:['歌い手 A'],status:'延期'}];
const videos=[{title:'歌ってみた · サンプル A',voice:'透きとおる',tags:['透明感','高音','やさしい']},{title:'歌ってみた · サンプル B',voice:'深く、響く',tags:['低音','ハスキー','やさしい']},{title:'歌ってみた · サンプル C',voice:'心はずむ',tags:['元気','爽やか','力強い']}];
const tags=['透明感','ハスキー','低音','高音','やさしい','力強い','ささやき系','爽やか','元気'];let selectedTags=[];
let publicEvents=[],publicVideos=[],publicRecruitments=[];
function availableEvents(){return ($('demo').checked?events:publicEvents).filter(e=>!$('region').value||e.region===$('region').value);}
function empty(title,description){const div=document.createElement('div');div.className='empty';const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=description;div.append(h,p);return div;}
const sampleProfileIds=new Map(Array.from({length:12},(_,i)=>{const id=String.fromCharCode(65+i);return ['歌い手 '+id,id];}));
function showDialog(title,paragraphs,event){$('dialog-content').replaceChildren();const h=document.createElement('h2');h.textContent=title;$('dialog-content').append(h);paragraphs.forEach(text=>{const p=document.createElement('p');p.textContent=text;if(event&&text.startsWith('出演（自己申告）：')){p.replaceChildren(document.createTextNode('出演（自己申告）：'));event.performers.forEach((name,index)=>{if(index)p.append(document.createTextNode('、'));const id=sampleProfileIds.get(name)||event.performerLinks?.find(profile=>profile.name===name)?.id;if(id){const link=document.createElement('a');link.href='./profile.html?'+(event.sample?'artist=':'id=')+encodeURIComponent(id);link.textContent=name;link.className='performer-profile-link';p.append(link);}else{p.append(document.createTextNode(name));}});}$('dialog-content').append(p);});if(event){if(event.poster){const image=document.createElement('img');image.src=event.poster;image.alt=event.title+'のフライヤー'+(event.sample?'（表示サンプル）':'');image.className='poster-enlarged';image.onerror=()=>{const notice=document.createElement('p');notice.textContent='フライヤーを読み込めませんでした。';image.replaceWith(notice);};h.after(image);}else{const notice=document.createElement('p');notice.textContent='フライヤーはまだ登録されていません。';h.after(notice);}if(!event.sample&&/^[0-9a-f-]{36}$/i.test(event.id||'')){const save=document.createElement('button'),status=document.createElement('p');save.className='outline';save.textContent='☆ ライブを保存';status.className='quiet';status.setAttribute('role','status');$('dialog-content').append(save,status);savedEventState(supabase,event.id).then(active=>{save.textContent=active?'★ 保存済み':'☆ ライブを保存';save.setAttribute('aria-pressed',String(active));}).catch(()=>{});save.onclick=async()=>{save.disabled=true;status.textContent='保存しています…';try{const active=await toggleSavedEvent(supabase,event.id);save.textContent=active?'★ 保存済み':'☆ ライブを保存';save.setAttribute('aria-pressed',String(active));status.textContent=active?'ライブを保存しました。':'ライブの保存を解除しました。';}catch(error){status.textContent=error.message;}finally{save.disabled=false;}};}}$('dialog').showModal();}
function renderCalendar(){
 updateRegionOptions();
 $('month').textContent=`${year} / ${String(month+1).padStart(2,'0')}`;$('days').replaceChildren();
 const filtered=availableEvents();
 monthCells(year,month).forEach(day=>{if(!day){$('days').append(document.createElement('span'));return;}const key=dateKey(year,month,day),items=filtered.filter(e=>e.date===key);const button=document.createElement('button');button.className='day'+(key===dateKey(now.getFullYear(),now.getMonth(),now.getDate())?' today':'');button.setAttribute('aria-pressed',String(key===selected));button.setAttribute('aria-label',`${year}年${month+1}月${day}日、ライブ${items.length}件`);const n=document.createElement('span');n.textContent=day;const dot=document.createElement('span');dot.className='dots';dot.textContent=items.length?`● ${items.length}件`:'';button.append(n,dot);button.onclick=()=>{selected=key;renderCalendar();};$('days').append(button);});
 const items=filtered.filter(e=>e.date===selected);$('selected-day').textContent=`${Number(selected.slice(5,7))}月${Number(selected.slice(8))}日のライブ`;$('count').textContent=`${items.length}件`;$('event-list').replaceChildren();
 if(!items.length)$('event-list').append(empty($('demo').checked?'条件に合うライブはありません':'まだライブが掲載されていません。',$('demo').checked?'別の日付や地域を選んでお試しください。':'別の日付や地域もご確認ください。'));
 items.forEach(event=>{const card=document.createElement('article');card.className='event';const button=document.createElement('button');if(event.sample){const sample=document.createElement('span');sample.className='sample';sample.textContent='表示サンプル';button.append(sample);}const meta=document.createElement('p');meta.className='meta';meta.textContent=`${event.region} / ${event.status}`;const title=document.createElement('h4');title.textContent=event.title+' ↗';const location=document.createElement('p');location.textContent=`開演 ${event.time} · ${event.venue}`;const performers=document.createElement('p');performers.textContent=`出演（自己申告）：${event.performers.join(' / ')||'未登録'}`;button.append(meta,title,location,performers);button.onclick=()=>showDialog(event.title,[event.sample?'表示サンプルです。実在のライブ案内ではありません。':event.description||'ライブの詳細説明はありません。',`${event.date} / 開演 ${event.time} / ${event.status}`,`${event.region} · ${event.venue}`,`出演（自己申告）：${event.performers.join('、')||'未登録'}`],event);card.append(button);$('event-list').append(card);});
}
function renderTags(){ $('tags').replaceChildren();tags.forEach(tag=>{const button=document.createElement('button');button.className='tag';button.textContent='#'+tag;button.setAttribute('aria-pressed',String(selectedTags.includes(tag)));button.onclick=()=>{selectedTags=selectedTags.includes(tag)?selectedTags.filter(t=>t!==tag):[...selectedTags,tag];renderTags();};$('tags').append(button);});$('videos').replaceChildren();const results=filterVideos($('demo').checked?videos:publicVideos,selectedTags);if(!results.length)$('videos').append(empty($('demo').checked?'選んだタグをすべて含む動画は見つかりませんでした。':'歌ってみたはまだ掲載されていません','タグを減らすか、後日もう一度ご覧ください。'));results.forEach(video=>{const article=document.createElement('article');article.className='video-card';const art=document.createElement('div');art.className='video-art';const strong=document.createElement('strong');strong.textContent=video.voice;const label=document.createElement('small');label.textContent=video.url?'PUBLIC VIDEO':'VOICE SAMPLE';art.append(strong,label);const body=document.createElement('div');body.className='video-body';if(!video.url){const badge=document.createElement('span');badge.className='sample';badge.textContent='表示サンプル・動画未接続';body.append(badge);}const h=document.createElement(video.url?'a':'h3');h.textContent=video.title;if(video.url){h.href=video.url;h.target='_blank';h.rel='noopener noreferrer';}const p=document.createElement('p');p.textContent=video.tags.map(t=>'#'+t).join(' ');body.append(h,p);article.append(art,body);$('videos').append(article);}); }
function renderRecruitments(){
 const list=$('recruitment-list');list.replaceChildren();
 if(!publicRecruitments.length){list.append(empty('現在公開中の出演者募集はありません。','主催者が公開した募集がここに表示されます。'));return;}
 for(const item of publicRecruitments){
  const article=document.createElement('article');article.className='recruitment-card';
  const meta=document.createElement('p');meta.className='meta';meta.textContent=[item.event_date,item.region].filter(Boolean).join(' · ')||'日程・地域は主催者へ確認';
  const title=document.createElement('h3');title.textContent=item.title;
  const organizer=document.createElement('p');organizer.textContent=`主催：${item.organizer}`;
  const concept=document.createElement('p');concept.textContent=item.concept||'詳しい募集内容は主催者へご確認ください。';
  const actions=document.createElement('div');actions.className='recruitment-actions';
  const interest=document.createElement('button'),status=document.createElement('p');interest.type='button';interest.className='primary';interest.textContent=item.acceptingInterest?'出演に興味あり':'現在は受付していません';interest.disabled=!item.acceptingInterest;status.className='quiet';status.setAttribute('role','status');
  interest.onclick=async()=>{interest.disabled=true;status.textContent='送信しています…';try{await sendRecruitmentInterest(supabase,item.id);interest.textContent='送信済み';status.textContent='主催者へ興味を通知しました。具体的な相談はXのDMで行ってください。';}catch(error){status.textContent=error.message;interest.disabled=false;}};actions.append(interest);
  if(item.organizerX){const x=document.createElement('a');x.className='outline';x.href=item.organizerX;x.target='_blank';x.rel='noopener noreferrer';x.textContent='主催者のXを見る ↗';actions.append(x);}
  article.append(meta,title,organizer,concept,actions,status);list.append(article);
 }
}
function moveMonth(delta){const d=new Date(year,month+delta,1);year=d.getFullYear();month=d.getMonth();selected=dateKey(year,month,1);renderCalendar();}
$('previous').onclick=()=>moveMonth(-1);$('next').onclick=()=>moveMonth(1);$('today').onclick=()=>{year=now.getFullYear();month=now.getMonth();selected=dateKey(year,month,now.getDate());renderCalendar();};$('region').onchange=renderCalendar;$('demo').onchange=()=>{renderCalendar();renderTags();};$('reset-tags').onclick=()=>{selectedTags=[];renderTags();};$('close-dialog').onclick=()=>$('dialog').close();
async function syncAccountButtons(){
 const {data:{session}}=await supabase.auth.getSession();const loggedIn=Boolean(session?.user);
 document.querySelectorAll('[data-account]').forEach(button=>{button.textContent=loggedIn?'マイページ':'ログイン / 登録';button.onclick=()=>{location.href=loggedIn?'./mypage.html':'./account.html';};});
 return loggedIn;
}
await syncAccountButtons();supabase.auth.onAuthStateChange(()=>{syncAccountButtons();});
// Keep the preview fixtures upcoming, including at month/year boundaries.
events.slice(0,2).forEach((event,i)=>{const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1+i*2);event.date=dateKey(day.getFullYear(),day.getMonth(),day.getDate());event.sample=true;event.poster=samplePoster(i?960:600,i?540:850,event.title,i?'#253349':'#632a4a');});
const refreshPosters=mountPosterCarousel({getEvents:()=>$('demo').checked?events:publicEvents,onOpen:event=>{showDialog(event.title,[`${event.date} · ${event.region} · 開演 ${event.time}`,event.sample?'表示サンプルです。実際のポスターは掲載準備中です。':event.description||'ライブの詳細説明はありません。'],event);}});
$('demo').addEventListener('change',refreshPosters);
renderCalendar();renderTags();renderRecruitments();refreshPosters();
function updateRegionOptions(){
 const regions=upcomingRegions($('demo').checked?events:publicEvents);
 const signature=JSON.stringify(regions);
 if($('region').dataset.regions===signature)return false;
 const previous=$('region').value;
 $('region').replaceChildren(new Option('すべての地域',''),...regions.map(region=>new Option(region,region)));
 $('region').value=regions.includes(previous)?previous:'';
 $('region').dataset.regions=signature;
 return true;
}
// Re-evaluate while open and when returning to a backgrounded tab.
setInterval(()=>{if(updateRegionOptions())renderCalendar();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&updateRegionOptions())renderCalendar();});

try{
 const data=await loadPublicData(supabase);publicEvents=data.events;publicVideos=data.videos;publicRecruitments=data.recruitments;
 const favoriteIds=await loadFavoriteProfileIds(supabase).catch(()=>[]),orderedProfiles=prioritizeFavoriteProfiles(data.profiles,favoriteIds);
 window.oshilinkPublicProfiles=orderedProfiles;window.dispatchEvent(new CustomEvent('oshilink:artists',{detail:orderedProfiles}));
 $('data-status').textContent=demoMode?'確認用の表示サンプルを使用できます。':'';
 $('data-banner').hidden=!demoMode;
}catch(error){$('data-status').textContent='公開情報を読み込めませんでした。再読み込みしてください。';}
renderCalendar();renderTags();renderRecruitments();refreshPosters();
