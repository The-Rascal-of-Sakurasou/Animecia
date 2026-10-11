(()=>{try{
  // Establish connections only for origins this page actually uses.
  const scripts=Array.from(document.scripts).map(s=>s.src).filter(Boolean);
  const origins=[];
  if(scripts.some(src=>/supabase-js|supabase|auth-core\.js|auth-required\.js/i.test(src))) origins.push('https://bhgdjuwlxvbaeraaivmh.supabase.co');
  if(scripts.some(src=>src.startsWith('https://cdn.jsdelivr.net/'))) origins.push('https://cdn.jsdelivr.net');
  for(const href of origins){
    if(!document.head.querySelector('link[rel="preconnect"][href="'+href+'"]')){
      const l=document.createElement('link');l.rel='preconnect';l.href=href;l.crossOrigin='anonymous';document.head.appendChild(l);
    }
  }
  if('serviceWorker' in navigator) window.addEventListener('load',()=>{
    const script=document.querySelector('script[src*="performance.js"]');
    const sw=new URL('sw.js',script?.src||document.baseURI);
    navigator.serviceWorker.register(sw,{scope:new URL('./',sw).pathname}).catch(()=>{});
  },{once:true});
}catch(e){}})();