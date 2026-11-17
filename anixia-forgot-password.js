(() => {
  "use strict";
  document.getElementById("forgot-form").addEventListener("submit",async e=>{
    e.preventDefault();
    const button=document.getElementById("submit"),message=document.getElementById("message");
    button.disabled=true;message.textContent="送信しています…";
    try{
      const redirectTo=new URL("reset-password.html",location.href).href;
      const {error}=await ANIXIA.getClient().auth.resetPasswordForEmail(document.getElementById("email").value.trim(),{redirectTo});
      if(error)throw error;
      message.textContent="該当するアカウントがある場合、再設定メールを送信しました。受信箱と迷惑メールフォルダを確認してください。";
    }catch(error){console.error(error);message.textContent="メールを送信できませんでした。時間をおいて再度お試しください。";}
    finally{button.disabled=false;}
  });
})();
