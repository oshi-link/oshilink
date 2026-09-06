import { voiceTags, tagDisabled, validFlyer, allowedPanels, lpIntro } from './mypage-rules.mjs?v=required-3';
import {bindImagePreview} from './local-image-preview.mjs?v=drag-1';
import {buildProfilePayload,saveMyProfiles,loadMyProfiles,profileFormValues} from './profile-save.mjs?v=prefill-1';
import {saveSelectedProfileImages,showSavedProfileImages} from './profile-images.mjs?v=crop-1';
import {buildVideoPost,saveMyVideo,buildLivePost,findEventCandidates,saveMyEvent} from './posting-save.mjs';
import {loadMyContent,setContentPublic,publishMyEvent} from './content-management.mjs';
import {supabase} from './supabase-client.mjs';
import {buildRecruitment,saveRecruitment,publishRecruitment,loadMatchingDashboard,setMatchingOpen,markNotificationRead,cancelInterest} from './matching.mjs';
const $ = id => document.getElementById(id);
window.oshilinkSupabase=supabase;
let sessionLoggedIn=false;
let logoutRequested=false;
const goHomeAfterLogout=()=>location.replace(new URL('./index.html',location.href).href);
supabase.auth.onAuthStateChange(event=>{
  if(event==='SIGNED_OUT'&&logoutRequested)setTimeout(goHomeAfterLogout,0);
});

async function syncSession(){
  const {data:{session}}=await supabase.auth.getSession();
  const loggedIn=Boolean(session?.user);
  sessionLoggedIn=loggedIn;
  $('session-banner').textContent=loggedIn?'マイページ · ログイン中':'マイページ · 未ログイン';
  $('session-status').textContent=loggedIn
    ? 'ログイン済みです。新しいプロフィールは公開状態で保存されます。'
    : 'プロフィールの確認はできます。保存するにはログインしてください。';
  $('login-link').hidden=loggedIn;
  $('logout-button').hidden=!loggedIn;
  return loggedIn;
}

$('logout-button').addEventListener('click',async()=>{
  $('logout-button').disabled=true;
  logoutRequested=true;
  const {error}=await supabase.auth.signOut();
  if(error){
    logoutRequested=false;
    $('session-status').textContent='ログアウトできませんでした。通信状況をご確認ください。';
    $('logout-button').disabled=false;
    return;
  }
  goHomeAfterLogout();
});

await syncSession();
$('live-form').querySelector('.quiet:last-child').textContent='ログイン後、同じ日・同じ表記の公開ライブを確認し、新規登録または出演追加を選べます。新規登録は非公開状態で保存します。';
const imageResets=[];
for(const section of document.querySelectorAll('[data-role]')){
  const role=section.dataset.role;
  const editor=document.createElement('fieldset');editor.className='profile-image-editor';
  const legend=document.createElement('legend');legend.textContent='プロフィール画像（任意）';editor.append(legend);
  const help=document.createElement('p');help.className='quiet';help.textContent='画像を選ぶと見え方を確認できます。JPEG・PNG・WebP、5MBまで。プロフィールと一緒に保存します。';editor.append(help);
  for(const [kind,title] of [['avatar','アイコン'],['cover','カバー画像']]){
    const block=document.createElement('div');block.className='image-choice';
    const label=document.createElement('label');label.className='field';label.textContent=title;
    if(kind==='cover'){
      const recommendation=document.createElement('span');recommendation.className='cover-ratio-hint';
      recommendation.textContent='比率 3：1｜1500 × 500 px';label.append(recommendation);
    }
    const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.id=`${role}-${kind}-input`;label.append(input);
    const frame=document.createElement('div');frame.className=`local-image-frame local-image-${kind}`;
    const placeholder=document.createElement('span');placeholder.textContent='画像未設定';
    const image=document.createElement('img');image.alt=`選択した${title}のプレビュー`;image.hidden=true;frame.append(placeholder,image);
    const controls=document.createElement('div');controls.className='image-position-controls';
    const makeRange=(text,min,max,step,value)=>{const label=document.createElement('label');label.textContent=text;const range=document.createElement('input');range.type='range';range.min=min;range.max=max;range.step=step;range.value=value;range.disabled=true;label.append(range);controls.append(label);return range;};
    const zoom=makeRange('拡大・縮小','1','3','.05','1');
    const dragHelp=document.createElement('p');dragHelp.className='image-drag-help';dragHelp.textContent='画像を直接ドラッグして位置を調整';controls.append(dragHelp);
    const remove=document.createElement('button');remove.type='button';remove.className='outline';remove.textContent=`${title}の選択を解除`;remove.disabled=true;
    const notice=document.createElement('p');notice.className='quiet';notice.id=`${role}-${kind}-notice`;notice.setAttribute('role','status');input.setAttribute('aria-describedby',notice.id);
    const note=document.createElement('p');note.className='quiet';note.textContent=kind==='avatar'?'丸い枠に合わせて表示します。画像の端が隠れる場合があります。':'Xで使っているヘッダー画像をそのまま選べます。別の比率の画像も使えますが、余白が入る場合があります。';
    block.append(label,frame,controls,note,remove,notice);editor.append(block);
    imageResets.push(bindImagePreview({input,image,frame,notice,remove,placeholder,zoom}));
  }
  section.append(editor);
}
window.addEventListener('pagehide',()=>imageResets.forEach(reset=>reset()));
const roles = () => [...document.querySelectorAll('.role-picker input:checked')].map(input => input.value);
let pendingProfiles=null;
let pendingVideo=null;
let pendingLive=null;
let pendingRecruitment=null;
function selectPanel(panel) {
  document.querySelectorAll('[data-panel]').forEach(button => {
    const selected = button.dataset.panel === panel;
    button.setAttribute('aria-pressed', String(selected));
    $(button.dataset.panel + '-panel').hidden = !selected;
  });
}
function syncRoles() {
  const selected = roles();
  const creator = selected.includes('singer') || selected.includes('organizer');
  $('lp-intro').textContent = lpIntro(selected);
  document.querySelectorAll('[data-role], [data-creator]').forEach(section => {
    section.hidden = section.hasAttribute('data-creator') ? !creator : !selected.includes(section.dataset.role);
    section.querySelectorAll('input, textarea, select').forEach(input => input.disabled = section.hidden);
  });
  const panels = allowedPanels(selected);
  document.querySelector('[data-panel="video"]').disabled = !panels.video;
  document.querySelector('[data-panel="live"]').disabled = !panels.live;
  document.querySelector('[data-panel="recruitment"]').disabled = !selected.includes('organizer');
  const active = document.querySelector('[data-panel][aria-pressed="true"]');
  if (active.disabled) selectPanel('profile');
  $('role-notice').textContent = selected.length ? '' : '利用タイプを1つ以上選んでください。';
  $('profile-form').querySelector('[type="submit"]').disabled = !selected.length;
}
async function restoreSavedProfiles(){
  if(!sessionLoggedIn)return;
  try{
    const profiles=await loadMyProfiles(window.oshilinkSupabase);
    if(!profiles.length)return;
    const restored=profileFormValues(profiles);
    document.querySelectorAll('.role-picker input').forEach(input=>{input.checked=restored.kinds.includes(input.value);});
    for(const [name,value] of Object.entries(restored.values)){
      const field=$('profile-form').elements.namedItem(name);
      if(field){field.value=value;field.setCustomValidity?.('');}
    }
    syncRoles();
    await showSavedProfileImages(window.oshilinkSupabase,$('profile-form'),profiles);
    $('session-status').textContent='ログイン済みです。保存済みのプロフィールと画像を読み込みました。';
  }catch(error){
    $('session-status').textContent=error.message;
  }
}
document.querySelectorAll('.role-picker input').forEach(input => input.addEventListener('change', syncRoles));
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {selectPanel(button.dataset.panel);if(button.dataset.panel==='manage')renderManagement();if(button.dataset.panel==='matching')renderMatching();}));

async function renderMatching(){
  const status=$('matching-status'),profiles=$('matching-profiles'),notifications=$('notification-list'),sentList=$('sent-interest-list');profiles.replaceChildren();notifications.replaceChildren();sentList.replaceChildren();
  if(!sessionLoggedIn){status.textContent='受付設定と通知を見るにはログインしてください。';return;}
  status.textContent='マッチング情報を読み込んでいます…';
  try{
    const data=await loadMatchingDashboard(window.oshilinkSupabase);
    if(!data.profiles.length)profiles.append(Object.assign(document.createElement('p'),{className:'quiet',textContent:'歌い手または主催者プロフィールを作成してください。'}));
    for(const profile of data.profiles){
      const row=document.createElement('div');row.className='matching-row';
      const text=document.createElement('p');const kind=profile.kind==='singer'?'歌い手':'主催者';text.textContent=`${kind}｜${profile.display_name}｜${profile.matching_open?'受付中':'受付OFF'}`;
      const button=document.createElement('button');button.type='button';button.className='outline';button.textContent=profile.matching_open?'受付をOFFにする':'受付をONにする';
      if(!profile.matching_open&&(!profile.is_public||!profile.x_url)){button.disabled=true;button.title='プロフィールの公開とX URLの登録が必要です。';}
      button.onclick=async()=>{button.disabled=true;status.textContent='受付設定を変更しています…';try{await setMatchingOpen(window.oshilinkSupabase,profile.id,!profile.matching_open);await renderMatching();}catch(error){status.textContent=error.message;button.disabled=false;}};
      row.append(text,button);profiles.append(row);
    }
    if(!data.notifications.length)notifications.append(Object.assign(document.createElement('p'),{className:'quiet',textContent:'新しい通知はありません。'}));
    for(const item of data.notifications){
      const article=document.createElement('article');article.className='notification-card';if(!item.read_at)article.dataset.unread='true';
      const title=document.createElement('h4');title.textContent=item.direction==='singer_to_recruitment'?`${item.senderName}さんが募集に興味を示しました`:`${item.senderName}さんから出演相談があります`;
      const time=document.createElement('p');time.className='quiet';time.textContent=new Date(item.created_at).toLocaleString('ja-JP');article.append(title,time);
      if(item.state==='cancelled')article.append(Object.assign(document.createElement('p'),{textContent:'この興味は取り消されています。'}));
      else if(item.senderX){const link=document.createElement('a');link.className='primary';link.href=item.senderX;link.target='_blank';link.rel='noopener noreferrer';link.textContent='相手のXを開く ↗';article.append(link);}
      if(!item.read_at){const read=document.createElement('button');read.type='button';read.className='text-link';read.textContent='既読にする';read.onclick=async()=>{read.disabled=true;try{await markNotificationRead(window.oshilinkSupabase,item.id);await renderMatching();}catch(error){status.textContent=error.message;read.disabled=false;}};article.append(read);}
      notifications.append(article);
    }
    if(!data.sent.length)sentList.append(Object.assign(document.createElement('p'),{className:'quiet',textContent:'送信済みの興味・出演相談はありません。'}));
    for(const item of data.sent){
      const article=document.createElement('article');article.className='notification-card';
      const title=document.createElement('h4');title.textContent=item.direction==='singer_to_recruitment'?`${item.targetName}へ興味を送信`:`${item.targetName}へ出演相談を送信`;
      const meta=document.createElement('p');meta.className='quiet';meta.textContent=`${new Date(item.created_at).toLocaleString('ja-JP')}｜${item.state==='active'?'送信中':'取消済み'}`;article.append(title,meta);
      if(item.state==='active'){const cancel=document.createElement('button');cancel.type='button';cancel.className='outline';cancel.textContent='取り消す';cancel.onclick=async()=>{cancel.disabled=true;status.textContent='取り消しています…';try{await cancelInterest(window.oshilinkSupabase,item.id);await renderMatching();}catch(error){status.textContent=error.message;cancel.disabled=false;}};article.append(cancel);}
      sentList.append(article);
    }
    status.textContent='出演決定ではありません。具体的な確認や相談はXのDMで行ってください。';
  }catch(error){status.textContent=error.message;}
}
$('refresh-matching').addEventListener('click',renderMatching);

async function renderManagement(){
  const status=$('management-status'),list=$('management-list');list.replaceChildren();
  if(!sessionLoggedIn){status.textContent='一覧を見るにはログインしてください。';return;}
  status.textContent='一覧を読み込んでいます…';
  try{
    const content=await loadMyContent(window.oshilinkSupabase);
    const recruitments=await window.oshilinkSupabase.schema('oshilink_v2').from('recruitments').select('id,title,event_date,is_public,is_open').order('created_at',{ascending:false});
    if(recruitments.error)throw new Error('出演者募集を読み込めませんでした。');
    const groups=[['プロフィール','profiles',content.profiles],['歌ってみた','videos',content.videos],['登録したライブ','events',content.events],['出演者募集','recruitments',recruitments.data||[]]];
    for(const [title,type,items] of groups){
      const section=document.createElement('section');section.className='management-group';const heading=document.createElement('h3');heading.textContent=title;section.append(heading);
      if(!items.length){const empty=document.createElement('p');empty.className='quiet';empty.textContent='まだありません。';section.append(empty);}
      for(const item of items){
        const row=document.createElement('div');row.className='management-item';const text=document.createElement('p');text.textContent=`${item.display_name||item.title}${item.event_date?'｜'+item.event_date:''}｜${item.is_public?'公開中':'非公開'}`;
        const button=document.createElement('button');button.type='button';button.className='outline';button.textContent=['events','recruitments'].includes(type)?(item.is_public?'公開済み':'公開する'):(item.is_public?'非公開にする':'公開する');button.disabled=['events','recruitments'].includes(type)&&item.is_public;
        button.addEventListener('click',async()=>{button.disabled=true;status.textContent='公開状態を変更しています…';try{if(type==='events')await publishMyEvent(window.oshilinkSupabase,item.id);else if(type==='recruitments')await publishRecruitment(window.oshilinkSupabase,item.id);else await setContentPublic(window.oshilinkSupabase,type,item.id,!item.is_public);await renderManagement();}catch(error){status.textContent=error.message;button.disabled=false;}});
        row.append(text,button);section.append(row);
      }
      list.append(section);
    }
    status.textContent='本人の登録内容だけを表示しています。';
  }catch(error){status.textContent=error.message;}
}
$('refresh-management').addEventListener('click',renderManagement);
voiceTags.forEach(tag => {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox'; input.name = 'tag'; input.value = tag;
  label.append(input, document.createTextNode(tag));
  $('posting-tags').append(label);
  input.addEventListener('change', () => {
    const count = $('posting-tags').querySelectorAll(':checked').length;
    $('tag-count').textContent = count + ' / 5個選択';
    $('posting-tags').querySelectorAll('input').forEach(item => item.disabled = tagDisabled(item.checked, count));
  });
});
const labels = { singerName: '活動名', started: '活動開始日', singerRegion: '活動地域', style: 'ライブスタイル', organizerName: '主催者名', brand: 'ライブブランド名', organizerRegion: '開催地域', concept: '募集内容・コンセプト', listenerName: 'リスナー名', bio: '紹介文', cover: 'カバー内のメッセージ', x: '公開X URL', lp: '専用LP URL', title: 'タイトル', url: '動画URL', description: '紹介・説明', tag: '歌声タグ', date: '開催日', eventDate:'開催予定日', region: '開催地域', venue: '会場', doors: '開場', time: '開演', status: '開催状態', price: '料金表示', ticket: 'チケットURL' };
function appendReviewImage(container,source,title,kind){
  if(!source || source.hidden || !source.complete || !source.naturalWidth || !source.src.startsWith('blob:'))return;
  const figure=document.createElement('figure');figure.className='review-image';
  const caption=document.createElement('figcaption');caption.textContent=title;
  const frame=document.createElement('div');frame.className=kind==='flyer'?'review-flyer-frame':`local-image-frame local-image-${kind}`;
  const image=document.createElement('img');image.src=source.src;image.alt=title+'の確認画像';
  image.onerror=()=>{image.hidden=true;caption.textContent=title+'を読み込めませんでした。編集画面で選び直してください。';};
  frame.append(image);figure.append(caption,frame);container.append(figure);
}
function appendReviewImages(form){
  const container=document.createElement('section');container.className='review-images';
  if(form.id==='profile-form'){
    const roleNames={singer:'歌い手',organizer:'主催者',listener:'リスナー'};
    for(const role of roles()){
      const section=form.querySelector(`[data-role="${role}"]`);
      for(const [kind,title] of [['avatar','アイコン'],['cover','カバー画像']]){
        appendReviewImage(container,section.querySelector(`.local-image-${kind} img`),`${roleNames[role]}の${title}`,kind);
      }
    }
  }else if(form.id==='live-form')appendReviewImage(container,$('flyer-preview'),'フライヤー','flyer');
  if(container.childElementCount){
    const heading=document.createElement('h3');heading.textContent='選択した画像';container.prepend(heading);
    $('review-content').append(container);
  }
}
document.querySelectorAll('.studio form').forEach(form => {
  form.querySelectorAll('input[required]').forEach(input => {
    const validate = () => input.setCustomValidity(input.value.trim() ? '' : 'この項目を入力してください。');
    input.addEventListener('input', validate);
    validate();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const list = document.createElement('dl');
    for (const [key, value] of new FormData(form)) {
      if (typeof value !== 'string' || !value.trim()) continue;
      const term = document.createElement('dt'), detail = document.createElement('dd');
      term.textContent = labels[key] || key; detail.textContent = value;
      list.append(term, detail);
    }
    $('review-content').replaceChildren(list);
    appendReviewImages(form);
    pendingProfiles=form.id==='profile-form'
      ? buildProfilePayload(Object.fromEntries(new FormData(form)),roles())
      : null;
    pendingVideo=form.id==='video-form'?buildVideoPost({
      ...Object.fromEntries(new FormData(form)),tag:new FormData(form).getAll('tag')
    }):null;
    pendingLive=form.id==='live-form'?buildLivePost(Object.fromEntries(new FormData(form))):null;
    pendingRecruitment=form.id==='recruitment-form'?buildRecruitment(Object.fromEntries(new FormData(form))):null;
    if(pendingLive){
      const note=document.createElement('section');note.className='event-candidates';
      const candidates=sessionLoggedIn?await findEventCandidates(window.oshilinkSupabase,pendingLive):[];
      const heading=document.createElement('h3');heading.textContent=candidates.length?'同じライブかもしれない候補があります':'同じ日・同じ表記の公開ライブは見つかりませんでした';note.append(heading);
      for(const candidate of candidates){
        const label=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='existing-event';radio.value=candidate.id;
        label.append(radio,document.createTextNode(`${candidate.title}｜${candidate.region}・${candidate.venue}｜${String(candidate.starts).slice(0,5)}`));note.append(label);
      }
      const separate=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name='existing-event';radio.value='';radio.checked=true;
      separate.append(radio,document.createTextNode(candidates.length?'別のライブとして新規登録する':'新しいライブとして登録する'));note.append(separate);
      if(candidates.length&&!roles().includes('singer')){note.append(document.createTextNode('主催者プロフィールでは既存ライブへの出演追加はできません。'));note.querySelectorAll('input[value]:not([value=""])').forEach(input=>input.disabled=true);}
      $('review-content').prepend(note);
    }
    const saveable=Boolean(pendingProfiles||pendingVideo||pendingLive||pendingRecruitment);
    $('save-review').hidden=!saveable;
    $('save-review').textContent=pendingVideo?'歌ってみたを保存':pendingLive?'ライブ情報を保存':pendingRecruitment?'出演者募集を保存':'プロフィールを保存';
    $('save-review').disabled=!saveable || !sessionLoggedIn;
    $('save-review-status').hidden=!saveable;
    $('save-review-status').dataset.state='';
    $('save-review-status').textContent=sessionLoggedIn
      ? '確認後、「プロフィールを保存」を押してください。'
      : '保存するにはログインしてください。';
    $('review-dialog').showModal();
  });
});
let imageUrl;
$('flyer-input').addEventListener('change', () => {
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  const image = $('flyer-preview');
  image.hidden = true; image.removeAttribute('src');
  $('flyer-notice').textContent = '';
  const file = $('flyer-input').files[0];
  if (!file) return;
  if (!validFlyer(file)) {
    $('flyer-notice').textContent = '10MB以下のJPEG・PNG・WebP画像を選んでください。';
    $('flyer-input').value = ''; return;
  }
  image.onerror = () => { image.hidden = true; $('flyer-notice').textContent = '画像を読み込めませんでした。別の画像を選んでください。'; $('flyer-input').value = ''; };
  imageUrl = URL.createObjectURL(file); image.src = imageUrl; image.hidden = false;
});
$('close-review').onclick = $('back-to-edit').onclick = () => $('review-dialog').close();
$('save-review').addEventListener('click',async()=>{
  const button=$('save-review'),status=$('save-review-status');
  button.disabled=true;status.dataset.state='';status.textContent='保存しています…';
  try{
    if(pendingProfiles){await saveMyProfiles(window.oshilinkSupabase,pendingProfiles);const profiles=await loadMyProfiles(window.oshilinkSupabase);await saveSelectedProfileImages(window.oshilinkSupabase,$('profile-form'),profiles);await showSavedProfileImages(window.oshilinkSupabase,$('profile-form'),profiles);}
    else if(pendingVideo)await saveMyVideo(window.oshilinkSupabase,pendingVideo);
    else if(pendingLive){const selected=document.querySelector('input[name="existing-event"]:checked')?.value||null;await saveMyEvent(window.oshilinkSupabase,pendingLive,selected);}
    else if(pendingRecruitment)await saveRecruitment(window.oshilinkSupabase,pendingRecruitment);
    status.dataset.state='success';status.textContent=pendingVideo?'歌ってみたを非公開で保存しました。':pendingLive?'ライブ情報を非公開で保存、または既存ライブへ出演追加しました。':pendingRecruitment?'出演者募集を非公開で保存しました。投稿管理から公開できます。':'プロフィールと画像を保存しました。新しいプロフィールは公開されます。';
  }catch(error){
    status.dataset.state='error';status.textContent=error.message;
    button.disabled=false;
  }
});
$('review-dialog').addEventListener('close',()=>{
  $('review-content').replaceChildren();pendingProfiles=null;pendingVideo=null;pendingLive=null;pendingRecruitment=null;$('save-review').disabled=true;
});
syncRoles();
await restoreSavedProfiles();
