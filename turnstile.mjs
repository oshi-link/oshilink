const SCRIPT_URL='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function loadTurnstile(doc=document){
  if(globalThis.turnstile)return Promise.resolve(globalThis.turnstile);
  const existing=doc.querySelector(`script[src="${SCRIPT_URL}"]`);
  return new Promise((resolve,reject)=>{
    const script=existing||doc.createElement('script');
    script.addEventListener('load',()=>globalThis.turnstile?resolve(globalThis.turnstile):reject(new Error('セキュリティ確認を読み込めませんでした。')),{once:true});
    script.addEventListener('error',()=>reject(new Error('セキュリティ確認を読み込めませんでした。')),{once:true});
    if(!existing){script.src=SCRIPT_URL;script.defer=true;doc.head.append(script);}
  });
}

export async function mountTurnstile({container,sitekey,onToken,onUnavailable}){
  if(!container||!sitekey){onUnavailable?.();return null;}
  try{
    const api=await loadTurnstile();
    return api.render(container,{sitekey,theme:'dark',size:'flexible',language:'ja',action:'signup',callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>{onToken('');onUnavailable?.();}});
  }catch{
    onToken('');onUnavailable?.();
    return null;
  }
}
