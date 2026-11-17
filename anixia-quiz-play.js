(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let quiz=null,submitted=false;
  const id=new URLSearchParams(location.search).get("id");
  function render(){
    $("quiz-title").textContent=quiz.title;
    $("quiz-description").textContent=quiz.description||"全問に回答して、結果を確認しましょう。";
    $("questions").innerHTML=quiz.questions.map((q,i)=>`<section class="question-card"><h2>Q${i+1}. ${esc(q.question_text)}</h2>${q.choices.map(choice=>`<label class="choice"><input type="radio" name="${q.id}" value="${choice.id}"><span>${esc(choice.choice_text)}</span></label>`).join("")}</section>`).join("");
    $("quiz-loading").hidden=true;$("quiz-area").hidden=false;
  }
  async function init(){
    if(!id){$("quiz-loading").textContent="クイズIDが指定されていません。";return;}
    try{
      const user=await ANIXIA.getUser();
      if(!user){$("quiz-loading").innerHTML='クイズの回答を記録するには<a href="login.html">ログイン</a>してください。';return;}
      quiz=await ANIXIA.getQuiz(id);
      if(!quiz){$("quiz-loading").textContent="クイズが見つからないか、公開されていません。";return;}
      if(!quiz.questions.length){$("quiz-loading").textContent="このクイズにはまだ問題が登録されていません。";return;}
      render();
    }catch(e){console.error(e);$("quiz-loading").textContent="クイズを読み込めませんでした。";}
  }
  $("quiz-form").addEventListener("submit",async e=>{
    e.preventDefault();if(submitted)return;
    const answers=quiz.questions.map(q=>({questionId:q.id,selectedChoiceId:document.querySelector('input[name="'+q.id+'"]:checked')?.value||null}));
    if(answers.some(a=>!a.selectedChoiceId)){$("quiz-message").textContent="すべての問題に回答してください。";return;}
    $("submit-quiz").disabled=true;$("quiz-message").textContent="採点しています…";
    try{
      const result=await ANIXIA.submitQuiz(quiz.id,answers);
      if(!result)throw new Error("Empty grading result");
      submitted=true;
      $("quiz-form").hidden=true;
      $("quiz-result").hidden=false;
      $("quiz-result").innerHTML=`<h2>クイズ結果</h2><div class="result-score">${Number(result.score)||0} / ${Number(result.max_score)||0} 点</div><p>回答を保存しました。</p>${quiz.questions.map((q,i)=>q.explanation?`<div class="explanation"><b>Q${i+1} 解説</b>${esc(q.explanation)}</div>`:"").join("")}<p><a href="quiz.html">クイズ一覧へ戻る</a></p>`;
    }catch(error){console.error(error);$("quiz-message").textContent="採点に失敗しました。クイズの設定を確認して、もう一度お試しください。";$("submit-quiz").disabled=false;}
  });
  init();
})();
