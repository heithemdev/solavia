/* No offline cache: private orders must always come from the authenticated server. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function unseen(id){
  const cache=await caches.open('solavia-push-dedup-v1');const key=new Request(self.location.origin+'/admin/push-id/'+encodeURIComponent(id));
  if(await cache.match(key))return false;
  await cache.put(key,new Response('1'));const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-60)).map(k=>cache.delete(k)));return true;
}
self.addEventListener('push',event=>event.waitUntil((async()=>{
  let data;try{data=event.data.json();}catch{return;}
  if(!data.id||!await unseen(data.id))return;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const focused=windows.find(w=>w.focused&&new URL(w.url).pathname.startsWith('/admin'));
  await self.registration.showNotification(data.title||'Nouvelle commande',{body:data.body,icon:'/images/solavia/admin/icon-192.png',badge:'/images/solavia/admin/badge.png',tag:data.id,data:{url:'/admin/orders'},silent:Boolean(focused)});
  if(focused)focused.postMessage({type:'ORDER_SAVED',id:data.id});
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const url=new URL('/admin/orders',self.location.origin).href;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const existing=windows.find(w=>new URL(w.url).pathname.startsWith('/admin'));if(existing){await existing.navigate(url);await existing.focus();}else await self.clients.openWindow(url);})());});
