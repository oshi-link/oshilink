// Local-only preview. No network, persistence or verification status is involved.
export function validPreviewFile(file) {
  return !!file && ['image/jpeg','image/png','image/webp'].includes(file.type)
    && file.size > 0 && file.size <= 10*1024*1024;
}
export function bindImagePreview({input,image,notice,remove,placeholder}) {
  let url=null,version=0;
  function reset(){
    version++;
    if(url)URL.revokeObjectURL(url);
    url=null;image.removeAttribute('src');image.hidden=true;
    placeholder.hidden=false;remove.disabled=true;input.value='';notice.textContent='';
  }
  input.addEventListener('change',async()=>{
    const file=input.files[0];
    // Do not clear the selected file until it has been read by the browser.
    version++;const current=version;
    if(url)URL.revokeObjectURL(url);
    url=null;image.removeAttribute('src');image.hidden=true;placeholder.hidden=false;remove.disabled=true;notice.textContent='';
    if(!file)return;
    if(!validPreviewFile(file)){input.value='';notice.textContent='10MB以下のJPEG・PNG・WebP画像を選んでください。';return;}
    url=URL.createObjectURL(file);image.src=url;
    try{
      await image.decode();
      if(current!==version)return;
      image.hidden=false;placeholder.hidden=true;remove.disabled=false;
      notice.textContent='選択した画像を表示しています。保存・アップロードはされていません。';
    }catch{
      if(current!==version)return;
      reset();notice.textContent='画像を読み込めませんでした。別の画像を選んでください。';
    }
  });
  remove.addEventListener('click',()=>{reset();notice.textContent='画像の選択を解除しました。';});
  return reset;
}
