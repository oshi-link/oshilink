// Local-only preview. No network, persistence or verification status is involved.
export function validPreviewFile(file) {
  return !!file && ['image/jpeg','image/png','image/webp'].includes(file.type)
    && file.size > 0 && file.size <= 5*1024*1024;
}
const editors=new WeakMap();
const clamp=value=>Math.max(0,Math.min(1,value));
export function draggedPosition(startX,startY,deltaX,deltaY,width,height){
  return {x:clamp(startX-deltaX/Math.max(width,1)),y:clamp(startY-deltaY/Math.max(height,1))};
}
export function bindImagePreview({input,image,frame,notice,remove,placeholder,zoom}) {
  let url=null,version=0;
  const controls=[zoom].filter(Boolean),position={x:.5,y:.5};
  const applyPosition=()=>{const point=`${position.x*100}% ${position.y*100}%`;image.style.objectFit='cover';image.style.objectPosition=point;image.style.transformOrigin=point;image.style.transform=`scale(${zoom?.value||1})`;};
  controls.forEach(control=>control.addEventListener('input',applyPosition));
  editors.set(input,{image,zoom,position});
  let drag=null;
  frame.addEventListener('pointerdown',event=>{
    if(image.hidden||!input.files?.[0])return;
    drag={pointerId:event.pointerId,left:event.clientX,top:event.clientY,x:position.x,y:position.y};
    frame.setPointerCapture?.(event.pointerId);frame.classList.add('is-dragging');event.preventDefault();
  });
  frame.addEventListener('pointermove',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    const next=draggedPosition(drag.x,drag.y,event.clientX-drag.left,event.clientY-drag.top,frame.clientWidth,frame.clientHeight);
    position.x=next.x;position.y=next.y;applyPosition();event.preventDefault();
  });
  const endDrag=event=>{if(!drag||drag.pointerId!==event.pointerId)return;drag=null;frame.classList.remove('is-dragging');};
  frame.addEventListener('pointerup',endDrag);frame.addEventListener('pointercancel',endDrag);
  function reset(){
    version++;
    if(url)URL.revokeObjectURL(url);
    url=null;image.removeAttribute('src');image.hidden=true;
    placeholder.hidden=false;remove.disabled=true;input.value='';notice.textContent='';
    position.x=.5;position.y=.5;if(zoom)zoom.value='1';controls.forEach(control=>control.disabled=true);applyPosition();
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
      notice.textContent='画像をマウスまたは指で動かし、表示位置を調整できます。';
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
  const image=editor.image,zoom=Number(editor.zoom?.value||1),x=editor.position.x,y=editor.position.y;
  const source=cropArea(image.naturalWidth,image.naturalHeight,output.width,output.height,zoom,x,y);
  const canvas=document.createElement('canvas');canvas.width=output.width;canvas.height=output.height;
  canvas.getContext('2d').drawImage(image,source.x,source.y,source.width,source.height,0,0,output.width,output.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('画像を編集できませんでした。')),'image/webp',.9));
  return new File([blob],`${kind}.webp`,{type:'image/webp'});
}
