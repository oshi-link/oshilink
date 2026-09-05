export function upcomingPosters(events, now = new Date()) {
  const limit = now.getTime() + 30 * 86400000;
  const seen = new Set();
  return events.filter(event => {
    const start = Date.parse(`${event.date}T${event.time || '23:59'}:00+09:00`);
    if (!event.poster || event.status !== '開催予定' || event.public === false || !Number.isFinite(start) || start < now.getTime() || start > limit || seen.has(event.id)) return false;
    seen.add(event.id); return true;
  }).sort((a,b)=>`${a.date} ${a.time||'23:59'}`.localeCompare(`${b.date} ${b.time||'23:59'}`)).slice(0,6);
}

// Layout-test fixtures, not real event artwork. Nothing is fetched externally.
export function samplePoster(width,height,title,color) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${color}"/><rect x="20" y="20" width="${width-40}" height="${height-40}" fill="none" stroke="#f0c2dc" stroke-width="2"/><g fill="#fff" text-anchor="middle" font-family="sans-serif"><text x="50%" y="20%" font-size="18">表示サンプル / 実在の公演ではありません</text><text x="50%" y="48%" font-size="32" font-weight="bold">${title}</text><text x="50%" y="60%" font-size="20">${width>height?'横長':'縦長'}ポスターの表示確認</text><text x="50%" y="85%" font-size="18">四辺を切り取らず、全体を表示</text></g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function mountPosterCarousel({getEvents,onOpen}) {
  const el=id=>document.getElementById(id), root=el('poster-carousel');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let slides=[],index=0,paused=reduced.matches,hover=false,timer;
  function schedule(){clearInterval(timer);if(slides.length>1&&!paused&&!hover&&!document.hidden)timer=setInterval(()=>{index=(index+1)%slides.length;render();},6000);}
  function render(){
    el('poster-stage').replaceChildren();el('poster-caption').replaceChildren();
    const event=slides[index];
    el('poster-count').textContent=event?`${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`:'00 / 00';
    if(event){const button=document.createElement('button');button.className='poster-open';button.setAttribute('aria-label',`${event.title}のポスターを拡大`);const img=document.createElement('img');img.src=event.poster;img.alt=`${event.title}のポスター${event.sample?'（表示サンプル）':''}`;img.className='poster-image';img.onerror=()=>{button.replaceChildren(document.createTextNode('ポスターを読み込めませんでした。'));};button.append(img);button.onclick=()=>{paused=true;schedule();renderPause();onOpen(event);};el('poster-stage').append(button);const title=document.createElement('h2');title.textContent=event.title;const meta=document.createElement('p');meta.textContent=`${event.sample?'表示サンプル · ':''}${event.date.replaceAll('-','/')} · 開演 ${event.time} · ${event.region}`;el('poster-caption').append(title,meta);}else{el('poster-stage').textContent='直近のライブポスターは、まだ掲載されていません。';}
    el('poster-prev').disabled=el('poster-next').disabled=slides.length<2;
    el('poster-pause').disabled=slides.length<2;renderPause();
    [...el('poster-dots').children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  }
  function renderPause(){el('poster-pause').textContent=paused?'自動再生':'一時停止';}
  function move(delta){paused=true;index=(index+delta+slides.length)%slides.length;render();schedule();}
  el('poster-prev').onclick=()=>move(-1);el('poster-next').onclick=()=>move(1);
  el('poster-pause').onclick=()=>{paused=!paused;renderPause();schedule();};
  root.addEventListener('mouseenter',()=>{hover=true;schedule();});root.addEventListener('mouseleave',()=>{hover=false;schedule();});
  root.addEventListener('focusin',event=>{if(event.target!==el('poster-pause')){paused=true;renderPause();schedule();}});root.addEventListener('focusout',()=>setTimeout(schedule,0));
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',()=>{paused=reduced.matches;renderPause();schedule();});
  return function refresh(){slides=upcomingPosters(getEvents());index=0;el('poster-dots').replaceChildren();slides.forEach((event,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',`${i+1}枚目：${event.title}`);b.onclick=()=>{index=i;paused=true;render();schedule();};el('poster-dots').append(b);});render();schedule();};
}
