export async function loadPublicImageUrls(client,items){
  if(!client?.functions?.invoke||!Array.isArray(items)||!items.length)return {};
  const unique=[...new Map(items.filter(item=>item?.id&&item?.kind).map(item=>[`${item.kind}:${item.id}`,item])).values()];
  const images={};
  for(let offset=0;offset<unique.length;offset+=50){
    const result=await client.functions.invoke('resolve-public-images',{body:{items:unique.slice(offset,offset+50)}});
    if(!result.error&&result.data?.images)Object.assign(images,result.data.images);
  }
  return images;
}
