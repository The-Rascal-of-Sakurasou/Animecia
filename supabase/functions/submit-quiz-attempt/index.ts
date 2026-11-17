import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const authHeader=req.headers.get("Authorization");
 if(!authHeader?.startsWith("Bearer "))return json({error:"ログインが必要です。"},401);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service){console.error("Missing Supabase environment variables");return json({error:"サーバー設定を確認できません。"},500);}
 try{
  const userClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authHeader}}});
  const {data:userData,error:userError}=await userClient.auth.getUser();
  if(userError||!userData.user)return json({error:"ログイン状態を確認できません。"},401);
  const body=await req.json(),quizId=String(body?.quizId||""),answers=body?.answers;
  if(!uuidPattern.test(quizId)||!Array.isArray(answers)||answers.length<1||answers.length>100)return json({error:"送信内容を確認してください。"},400);
  const normalized=[];
  for(const a of answers){
   const questionId=String(a?.questionId||""),choice=a?.selectedChoiceId==null||a.selectedChoiceId===""?null:String(a.selectedChoiceId);
   if(!uuidPattern.test(questionId)||(choice!==null&&!uuidPattern.test(choice)))return json({error:"回答形式が正しくありません。"},400);
   normalized.push({question_id:questionId,selected_choice_id:choice});
  }
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.rpc("submit_quiz_attempt",{p_user_id:userData.user.id,p_quiz_id:quizId,p_answers:normalized});
  if(error){console.error("Quiz submission failed:",error.message);return json({error:"採点できませんでした。クイズの設定を確認してください。"},400);}
  return json({result:data});
 }catch(error){console.error("Unexpected quiz submission error:",error);return json({error:"採点処理中にエラーが発生しました。"},500);}
});
