import { supabase } from './supabase.js';
const detailBox = document.getElementById('artistDetail');
const slug = new URLSearchParams(location.search).get('slug');
(async function(){
  if (!slug) { detailBox.innerHTML='スラッグが指定されていません。'; return; }
  const { data, error } = await supabase.from('public_artists_view').select('*').eq('detail_slug', slug).single();
  if (error || !data) { detailBox.innerHTML='演者が見つかりません。'; return; }
  detailBox.innerHTML = `${data.header_image_url ? `<img src="${data.header_image_url}" alt="${data.name}" style="width:100%; height:280px; object-fit:cover; border-radius:18px; margin-bottom:20px;">` : ''}<h1>${data.name}</h1><p class="muted">${data.description || ''}</p>${data.x_url ? `<p><a href="${data.x_url}" class="primary-btn" target="_blank" rel="noopener noreferrer">Xを見る</a></p>` : ''}${data.pinned_video_url ? `<div class="panel" style="margin-top:20px;"><h3>固定動画</h3><p><a href="${data.pinned_video_url}" target="_blank" rel="noopener noreferrer">${data.pinned_video_url}</a></p></div>` : ''}`;
})();
