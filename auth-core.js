/* ANIXIA shared authentication core. Browser-only, publishable key only. */
(function(w){
  "use strict";
  var URL="https://trvnxggqzlhqdhoyiliy.supabase.co";
  var KEY="sb_publishable_UiVRBLbMIAy-1GZqVY35Zw_uEp-W_GJ";
  var state={client:null,user:null,ready:false,promise:null};

  function waitForSDK(){
    if(w.supabase&&typeof w.supabase.createClient==="function") return Promise.resolve();
    return new Promise(function(resolve,reject){
      var start=Date.now();
      (function poll(){
        if(w.supabase&&typeof w.supabase.createClient==="function") return resolve();
        if(Date.now()-start>10000) return reject(new Error("Supabase SDK timeout"));
        setTimeout(poll,50);
      })();
    });
  }

  function client(){
    if(!state.client){
      state.client=w.__anixiaAuthClient||(w.__anixiaAuthClient=w.supabase.createClient(URL,KEY,{
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true,
          storage:window.sessionStorage,
          storageKey:"anixia-auth-session"
        }
      }));
    }
    return state.client;
  }

  function isVerified(user){
    return !!(user&&!user.is_anonymous&&(user.email_confirmed_at||user.confirmed_at));
  }

  async function readSession(){
    var c=client();
    var result=await c.auth.getSession();
    if(result.error) throw result.error;
    var session=result.data&&result.data.session;
    state.user=isVerified(session&&session.user)?session.user:null;
    return session;
  }

  function init(){
    if(state.promise)return state.promise;
    state.promise=waitForSDK().then(async function(){
      var c=client();
      try{
        await readSession();
      }catch(sessionError){
        console.warn("ANIXIA session read failed; trying getUser()",sessionError);
        var r=await c.auth.getUser();
        state.user=isVerified(r.data&&r.data.user)?r.data.user:null;
      }
      state.ready=true;
      c.auth.onAuthStateChange(function(_event,session){
        state.user=isVerified(session&&session.user)?session.user:null;
        w.dispatchEvent(new CustomEvent("animecia-auth",{detail:{user:state.user}}));
      });
      return state.user;
    }).catch(function(e){
      state.ready=true;
      state.user=null;
      throw e;
    });
    return state.promise;
  }

  function signIn(email,password){
    return waitForSDK().then(async function(){
      var c=client();
      var result=await c.auth.signInWithPassword({email:email,password:password});
      if(result.error) throw result.error;
      var sessionResult=await c.auth.getSession();
      if(sessionResult.error) throw sessionResult.error;
      var user=sessionResult.data&&sessionResult.data.session&&sessionResult.data.session.user;
      state.user=isVerified(user)?user:null;
      state.ready=true;
      w.dispatchEvent(new CustomEvent("animecia-auth",{detail:{user:state.user}}));
      return {data:result.data,error:null,session:sessionResult.data&&sessionResult.data.session};
    });
  }

  function redirectToLogin(){
    var target=location.pathname.split("/").pop()||"index.html";
    var q=location.search||"";
    var h=location.hash||"";
    location.href="login.html?redirect="+encodeURIComponent(target+q+h);
  }

  w.ANIXIAAuth={
    URL:URL,KEY:KEY,state:state,client:client,init:init,
    getUser:function(){return init();},
    getSession:readSession,
    signIn:signIn,
    isLoggedIn:function(){return isVerified(state.user);},
    requireLogin:function(){
      return init().then(function(u){
        if(!u){redirectToLogin();return null;}
        return u;
      });
    },
    redirectToLogin:redirectToLogin,
    signOut:function(){
      return client().auth.signOut({scope:"local"}).then(function(result){
        state.user=null;
        state.ready=true;
        w.dispatchEvent(new CustomEvent("animecia-auth",{detail:{user:null}}));
        return result;
      });
    }
  };
})(window);
