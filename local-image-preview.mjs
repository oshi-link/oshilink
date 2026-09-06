// Local-only preview. No network, persistence or verification status is involved.
export function validPreviewFile(file) {
  return !!file && ['image/jpeg','image/png','image/webp'].includes(file.type)
    && file.size > 0 && file.size <= 5*1024*1024;
}
const editors=new WeakMap();
export function bindImagePreview({input,image,notice,remove,placeholder,zoom,horizontal,vertical}) {
  let url=null,version=0;
  const controls=[zoom,horizontal,vertical].filter(Boolean);
  const applyPosition=()=>{image.style.objectFit='cover';image.style.objectPosition=`${horizontal?.value||50}% ${vertical?.value||50}%`;image.style.transform=`scale(${zoom?.value||1})`;};
  controls.forEach(control=>control.addEventListener('input',applyPosition));
  editors.set(input,{image,zoom,horizontal,vertical});
  function reset(){
    version++;
    if(url)URL.revokeObjectURL(url);
    url=null;image.removeAttribute('src');image.hidden=true;
    placeholder.hidden=false;remove.disabled=true;input.value='';notice.textContent='';
    if(zoom)zoom.value='1';if(horizontal)horizontal.value='50';if(vertical)vertical.value='50';controls.forEach(control=>control.disabled=true);applyPosition();
  }
  input.addEventListener('change',async()=>{
    const file=input.files[0];
    // Do not clear the selected file until it has been read by the browser.
    version++;const current=version;
    if(url)URL.revokeObjectURL(url);
    url=null;image.removeAttribute('src');image.hidden=true;placeholder.hidden=false;remove.disabled=true;notice.textContent='';
    if(!file)return;
    if(!validPreviewFile(file)){input.value='';notice.textContent='5MB以下のJPEG・PNG・WebP画像を選んでください。';return;}
    url=URL.createObjectURL(file);image.src=url;
    try{
      await image.decode();
      if(current!==version)return;
      image.hidden=false;placeholder.hidden=true;remove.disabled=false;
      controls.forEach(control=>control.disabled=false);applyPosition();
      notice.textContent='表示位置を調整できます。プロフィール保存時に、この見え方でアップロードします。';
    }catch{
      if(current!==version)return;
      reset();notice.textContent='画像を読み込めませんでした。別の画像を選んでください。';
    }
  });
  remove.addEventListener('click',()=>{reset();notice.textContent='画像の選択を解除しました。';});
  return reset;
}

export function cropArea(imageWidth,imageHeight,outputWidth,outputHeight,zoom=1,x=.5,y=.5){
  const scale=Math.max(outputWidth/imageWidth,outputHeight/imageHeight)*zoom;
  const width=Math.min(imageWidth,outputWidth/scale),height=Math.min(imageHeight,outputHeight/scale);
  return {x:(imageWidth-width)*x,y:(imageHeight-height)*y,width,height};
}

export async function prepareSelectedImage(input,kind){
  const file=input?.files?.[0],editor=editors.get(input);
  if(!file||!editor?.image?.naturalWidth)return file||null;
  const output=kind==='avatar'?{width:800,height:800}:{width:1500,height:500};
  const image=editor.image,zoom=Number(editor.zoom?.value||1),x=Number(editor.horizontal?.value||50)/100,y=Number(editor.vertical?.value||50)/100;
  const source=cropArea(image.naturalWidth,image.naturalHeight,output.width,output.height,zoom,x,y);
  const canvas=document.createElement('canvas');canvas.width=output.width;canvas.height=output.height;
  canvas.getContext('2d').drawImage(image,source.x,source.y,source.width,source.height,0,0,output.width,output.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('画像を編集できませんでした。')),'image/webp',.9));
  return new File([blob],`${kind}.webp`,{type:'image/webp'});
}
