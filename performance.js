(()=>{try{
  // Establish connections only for origins this page actually uses.
  const scripts=Array.from(document.scripts).map(s=>s.src).filter(Boolean);
  const origins=[];
  if(scripts.some(src=>/anixia-client\.js/i.test(src))) origins.push('https://trvnxggqzlhqdhoyiliy.supabase.co');
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

  // Load the same design system on every page, including admin and utility pages.
  const sharedStyleScript=Array.from(document.scripts).find(s=>s.src.includes('performance.js'));
  if(sharedStyleScript&&!document.querySelector('link[data-anixia-unified-theme]')){
    const theme=document.createElement('link');
    theme.rel='stylesheet';
    theme.href=new URL('site-theme.css?v=anixia-unified-all-pages-20261119r',sharedStyleScript.src).href;
    theme.dataset.anixiaUnifiedTheme='true';
    document.head.appendChild(theme);
  }

  // Shared ANIXIA wordmark is loaded on both root pages and generated SEO pages.
  const performanceScript=Array.from(document.scripts).find(s=>s.src.includes('performance.js'));
  if(performanceScript&&!document.querySelector('script[data-anixia-global-header]')){
    const loader=document.createElement('script');
    loader.src=new URL('anixia-global-header.js?v=anixia-unified-nav-20261119r',performanceScript.src).href;
    loader.defer=true;
    loader.dataset.anixiaGlobalHeader='true';
    document.head.appendChild(loader);
  }
}catch(e){}})();