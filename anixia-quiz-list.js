(() => {
  "use strict";
  const el=document.getElementById("quiz-list");
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const difficulty=v=>({1:"初級",2:"中級",3:"上級"}[v]||("難易度 "+v));
  async function init(){
    try{
      const quizzes=await ANIXIA.listQuizzes();
      el.innerHTML=quizzes.length?quizzes.map(q=>`<article class="quiz-card"><small>${esc(q.category)} · ${difficulty(q.difficulty)}</small><h2>${esc(q.title)}</h2><p>${esc(q.description||"クイズに挑戦してみましょう。")}</p><a href="quiz-play.html?id=${encodeURIComponent(q.id)}">クイズに挑戦</a></article>`).join(""):'<p class="quiz-state">現在公開中のクイズはありません。クイズが公開されると、ここに表示されます。</p>';
    }catch(e){console.error(e);el.innerHTML='<div class="quiz-state"><p>クイズを読み込めませんでした。時間をおいて再度お試しください。</p><button type="button" id="quiz-retry">再試行</button></div>';document.getElementById("quiz-retry")?.addEventListener("click",init,{once:true});}
  }
  init();
})();
