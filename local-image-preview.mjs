// Local image editor. Selected bytes stay in the browser until the profile is saved.
export function validPreviewFile(file){return !!file&&['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size>0&&file.size<=5*1024*1024;}
const editors=new WeakMap();
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
export function draggedPosition(startX,startY,deltaX,deltaY,width,height){return{x:clamp(startX-deltaX/Math.max(width,1)),y:clamp(startY-deltaY/Math.max(height,1))};}
export function adjustedZoom(current,delta){return clamp(current+delta,1,3);}
export function cropArea(imageWidth,imageHeight,outputWidth,outputHeight,zoom=1,x=.5,y=.5){const scale=Math.max(outputWidth/imageWidth,outputHeight/imageHeight)*zoom;const width=Math.min(imageWidth,outputWidth/scale),height=Math.min(imageHeight,outputHeight/scale);return{x:(imageWidth-width)*x,y:(imageHeight-height)*y,width,height};}
async function renderCrop(editor,kind){
  const output=kind==='avatar'?{width:800,height:800}:{width:1500,height:500},source=cropArea(editor.source.naturalWidth,editor.source.naturalHeight,output.width,output.height,editor.zoom,editor.position.x,editor.position.y);
  const canvas=document.createElement('canvas');canvas.width=output.width;canvas.height=output.height;canvas.getContext('2d').drawImage(editor.source,source.x,source.y,source.width,source.height,0,0,output.width,output.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('画像を編集できませんでした。')),'image/webp',.9));return new File([blob],`${kind}.webp`,{type:'image/webp'});
}
export function bindImagePreview({input,image,frame,notice,remove,placeholder,kind,title}){
  let sourceUrl=null,previewUrl=null;const editor={source:new Image(),zoom:1,position:{x:.5,y:.5},outputFile:null};editors.set(input,editor);
  const dialog=document.createElement('dialog');dialog.className='image-crop-dialog';
  const heading=document.createElement('h2');heading.textContent=`${title}の表示を調整`;
  const help=document.createElement('p');help.className='quiet';help.textContent='PCはホイール、スマホは2本指で拡大・縮小。1本指またはマウスで位置を動かせます。';
  const stage=document.createElement('div');stage.className=`image-crop-stage image-crop-${kind}`;const cropImage=document.createElement('img');cropImage.alt=`${title}の編集中プレビュ`;stage.append(cropImage);
  const actions=document.createElement('div');actions.className='image-crop-actions';const cancel=document.createElement('button');cancel.type='button';cancel.className='outline';cancel.textContent='キャンセル';const apply=document.createElement('button');apply.type='button';apply.className='primary';apply.textContent='この表示に決定';actions.append(cancel,apply);dialog.append(heading,help,stage,actions);document.body.append(dialog);
  const applyView=()=>{const point=`${editor.position.x*100}% ${editor.position.y*100}%`;cropImage.style.objectPosition=point;cropImage.style.transformOrigin=point;cropImage.style.transform=`scale(${editor.zoom})`;};
  const pointers=new Map();let drag=null,pinch=null;const distance=()=>{const values=[...pointers.values()];return values.length<2?0:Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y);};
  stage.addEventListener('wheel',event=>{editor.zoom=adjustedZoom(editor.zoom,event.deltaY<0?.12:-.12);applyView();event.preventDefault();},{passive:false});
  stage.addEventListener('pointerdown',event=>{pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});stage.setPointerCapture?.(event.pointerId);if(pointers.size===1)drag={id:event.pointerId,left:event.clientX,top:event.clientY,x:editor.position.x,y:editor.position.y};if(pointers.size===2){pinch={distance:distance(),zoom:editor.zoom};drag=null;}event.preventDefault();});
  stage.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size>=2&&pinch){editor.zoom=clamp(pinch.zoom*(distance()/Math.max(pinch.distance,1)),1,3);applyView();}else if(drag?.id===event.pointerId){const next=draggedPosition(drag.x,drag.y,event.clientX-drag.left,event.clientY-drag.top,stage.clientWidth,stage.clientHeight);editor.position.x=next.x;editor.position.y=next.y;applyView();}event.preventDefault();});
  const endPointer=event=>{pointers.delete(event.pointerId);if(pointers.size<2)pinch=null;if(!pointers.size)drag=null;};stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);
  function clearSource(){if(sourceUrl)URL.revokeObjectURL(sourceUrl);sourceUrl=null;editor.source.removeAttribute('src');cropImage.removeAttribute('src');}
  function reset(){clearSource();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;editor.outputFile=null;editor.zoom=1;editor.position.x=.5;editor.position.y=.5;input.value='';image.removeAttribute('src');image.hidden=true;placeholder.hidden=false;remove.disabled=true;notice.textContent='';}
  input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;if(!validPreviewFile(file)){input.value='';notice.textContent='5MB以下のJPEG・PNG・WebP画像を選んでください。';return;}clearSource();editor.outputFile=null;editor.zoom=1;editor.position.x=.5;editor.position.y=.5;sourceUrl=URL.createObjectURL(file);editor.source.src=sourceUrl;cropImage.src=sourceUrl;try{await editor.source.decode();applyView();dialog.showModal();}catch{clearSource();input.value='';notice.textContent='画像を読み込めませんでした。別の画像を選んでください。';}});
  cancel.addEventListener('click',()=>{clearSource();input.value='';dialog.close();notice.textContent='画像の変更をキャンセルしました。';});
  apply.addEventListener('click',async()=>{apply.disabled=true;try{editor.outputFile=await renderCrop(editor,kind);if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(editor.outputFile);image.src=previewUrl;image.style.cssText='object-fit:cover;object-position:50% 50%;transform:none';image.hidden=false;placeholder.hidden=true;remove.disabled=false;dialog.close();notice.textContent='編集した画像をプロフィール保存時に反映します。';}finally{apply.disabled=false;}});
  remove.addEventListener('click',()=>{reset();notice.textContent='画像の選択を解除しました。';});return reset;
}
export async function prepareSelectedImage(input){return editors.get(input)?.outputFile||null;}
