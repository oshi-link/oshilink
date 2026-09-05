import {supabase} from './supabase-client.mjs';
import {loadPublicData} from './public-data.mjs';
const $=id=>document.getElementById(id);
const requestedArtist=new URLSearchParams(location.search).get('artist');
const artistId=/^[A-L]$/.test(requestedArtist||'')?requestedArtist:'A';
if(artistId!=='A'){
  document.title=`歌い手 ${artistId}｜プロフィール表示サンプル｜OshiLink`;
  const walker=document.createTreeWalker($('profile'),NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){const node=walker.currentNode;node.textContent=node.textContent.replaceAll('歌い手 A',`歌い手 ${artistId}`).replaceAll('歌い手A',`歌い手${artistId}`);}
  document.querySelector('.avatar').firstChild.textContent=artistId;
  document.querySelectorAll('[data-preview]').forEach(el=>{el.dataset.preview=el.dataset.preview.replaceAll('歌い手A',`歌い手${artistId}`);});
  // Additional identities demonstrate navigation, not additional real activity records.
  document.querySelector('.profile-event p:last-of-type').textContent=`出演（自己申告の表示例）：歌い手 ${artistId}`;
}
function renderCoverMessage(){const text=$('cover-message-input').value.trim();$('cover-message').textContent=text;$('cover-message').hidden=!text;}
$('cover-message-input').addEventListener('input',renderCoverMessage);renderCoverMessage();
const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);$('event-month').textContent=`${tomorrow.getMonth()+1}月`;$('event-day').textContent=tomorrow.getDate();
$('follow').onclick=()=>{const active=$('follow').getAttribute('aria-pressed')!=='true';$('follow').setAttribute('aria-pressed',String(active));$('follow').textContent=active?'♥ 推し登録済み':'♡ 推し登録';$('profile-status').textContent=active?'お試しで推し登録しました。本番には保存されず、再読み込みで元に戻ります。':'お試しの推し登録を解除しました。';};
$('has-lp').onchange=()=>{const hide=!$('has-lp').checked;$('services').hidden=hide;$('service-nav').hidden=hide;};
document.querySelectorAll('[data-preview]').forEach(button=>button.onclick=()=>{$('profile-message').textContent=button.dataset.preview;$('profile-dialog').showModal();});$('profile-close').onclick=()=>$('profile-dialog').close();

const realId=new URLSearchParams(location.search).get('id');
if(/^[0-9a-f-]{36}$/i.test(realId||'')){
  try{
    const data=await loadPublicData(supabase),profile=data.profiles.find(item=>item.id===realId);
    if(!profile)throw new Error('プロフィールが見つかりません。');
    document.title=`${profile.display_name}｜OshiLink`;
    document.querySelector('.preview').textContent='公開プロフィール';
    document.querySelector('.identity h1').textContent=profile.display_name;
    document.querySelector('.identity-copy > p:last-child').textContent=profile.bio||'紹介文はまだ登録されていません。';
    document.querySelector('.identity .sample')?.remove();
    document.querySelector('.avatar').firstChild.textContent=profile.display_name.slice(0,1);
    $('cover-message').textContent=profile.cover_message||'';$('cover-message').hidden=!profile.cover_message;
    document.querySelector('.follow-area').hidden=true;
    const about=$('about');about.querySelectorAll(':scope > p:not(.eyebrow)').forEach(node=>node.remove());
    const bio=document.createElement('p');bio.textContent=profile.bio||'紹介文はまだ登録されていません。';about.querySelector('h2').after(bio);
    const dl=about.querySelector('dl');dl.replaceChildren();for(const [term,value] of [['活動地域',profile.region||'未登録'],['ライブスタイル',profile.style||'未登録']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=term;dd.textContent=value;dl.append(dt,dd);}
    const xButton=about.querySelector('button[data-preview]');if(profile.x_url){const link=document.createElement('a');link.className='outline full';link.href=profile.x_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Xプロフィールを見る ↗';xButton.replaceWith(link);}else xButton.hidden=true;
    document.querySelector('.consultation').hidden=true;
    const videoWrap=document.querySelector('.profile-videos');videoWrap.replaceChildren();for(const video of data.videos.filter(item=>item.profileId===profile.id)){const article=document.createElement('article');article.className='video-card';const link=document.createElement('a');link.href=video.url;link.target='_blank';link.rel='noopener noreferrer';link.className='sample-video';link.textContent='▷ '+video.title;const body=document.createElement('div');body.className='video-body';const tags=document.createElement('p');tags.textContent=video.tags.map(tag=>'#'+tag).join(' ');body.append(tags);article.append(link,body);videoWrap.append(article);}if(!videoWrap.childElementCount)videoWrap.textContent='公開中の歌ってみたはまだありません。';
    const live=$('live');live.querySelectorAll('.profile-event').forEach(node=>node.remove());for(const event of data.events.filter(item=>item.performerLinks.some(p=>p.id===profile.id))){const article=document.createElement('article');article.className='profile-event';const body=document.createElement('div'),title=document.createElement('h3'),meta=document.createElement('p');title.textContent=event.title;meta.textContent=`${event.date} · ${event.region} · ${event.venue} · 開演 ${event.time}`;body.append(title,meta);article.append(body);live.append(article);}if(!live.querySelector('.profile-event')){const empty=document.createElement('p');empty.textContent='公開中の出演予定はまだありません。';live.append(empty);}
    if(profile.lp_url){const link=document.createElement('a');link.className='primary';link.href=profile.lp_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='サービス・ご依頼案内を見る ↗';$('services').querySelector('button')?.replaceWith(link);}else{$('services').hidden=true;$('service-nav').hidden=true;}
    document.querySelector('.preview-options').hidden=true;
  }catch(error){document.querySelector('.preview').textContent=error.message;document.querySelector('#profile').hidden=true;}
}
