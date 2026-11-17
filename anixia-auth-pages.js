(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const message=text=>{$("message").textContent=text;};
  const redirectTarget=()=>{
    const value=new URLSearchParams(location.search).get("redirect") || "";
    const allowed=["mypage.html","anime.html","ranking.html","quiz.html","recommendations.html","discover.html","season.html"];
    return allowed.includes(value) ? value : "mypage.html";
  };
  const login=$("login-form");
  if(login)login.addEventListener("submit",async e=>{
    e.preventDefault();$("submit").disabled=true;message("ログインしています…");
    try{
      const {data,error}=await ANIXIA.getClient().auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
      if(error)throw error;
      if(!data.user)throw new Error("ログイン情報を確認できませんでした。");
      location.href=redirectTarget();
    }catch(err){console.error(err);message("ログインできませんでした。メールアドレスとパスワードを確認してください。");}
    finally{$("submit").disabled=false;}
  });
  const signup=$("signup-form");
  if(signup)signup.addEventListener("submit",async e=>{
    e.preventDefault();
    const password=$("password").value;
    if(password!==$("password-confirm").value){message("パスワードが一致しません。");return;}
    if(password.length<8){message("パスワードは8文字以上にしてください。");return;}
    $("submit").disabled=true;message("登録しています…");
    try{
      const redirect=new URL("auth-callback.html",location.href).href;
      const {data,error}=await ANIXIA.getClient().auth.signUp({email:$("email").value.trim(),password,options:{emailRedirectTo:redirect}});
      if(error)throw error;
      if(data.session){location.href="mypage.html";return;}
      message("登録を受け付けました。確認メールのリンクを開くとログインできます。メールが届かない場合は迷惑メールフォルダも確認してください。");
      signup.reset();
    }catch(err){console.error(err);message("登録できませんでした。入力内容と通信状態を確認してください。");}
    finally{$("submit").disabled=false;}
  });
})();
