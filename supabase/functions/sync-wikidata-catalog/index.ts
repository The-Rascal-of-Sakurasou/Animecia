import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
const allowedOrigin="https://the-rascal-of-sakurasou.github.io";
const headers={"Access-Control-Allow-Origin":allowedOrigin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-anixia-cron-token","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json; charset=utf-8"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const formats:Record<string,string>={"Q63952888":"tv","Q20650540":"movie","Q220898":"ova","Q1047299":"web","Q117209498":"movie","Q117467240":"web","Q11086742":"tv"};
const query=(limit:number,offset:number)=>
"SELECT DISTINCT ?item ?itemLabel ?jaLabel ?date ?episodes ?class WHERE {"+
" VALUES ?class { wd:Q63952888 wd:Q20650540 wd:Q220898 wd:Q1047299 wd:Q117209498 wd:Q117467240 wd:Q11086742 }"+
" ?item wdt:P31 ?class ; wdt:P495 wd:Q17 ."+
" OPTIONAL { ?item wdt:P580 ?startDate . } OPTIONAL { ?item wdt:P577 ?publicationDate . }"+
" BIND(COALESCE(?startDate, ?publicationDate) AS ?date) FILTER(BOUND(?date) && YEAR(?date)>=1963)"+
" OPTIONAL { ?item wdt:P1113 ?episodes . }"+
" OPTIONAL { ?item rdfs:label ?jaLabel . FILTER(LANG(?jaLabel)='ja') }"+
" SERVICE wikibase:label { bd:serviceParam wikibase:language 'ja,en'. }"+
" } ORDER BY ?item LIMIT "+limit+" OFFSET "+offset;
async function fetchPage(limit:number,offset:number){
 const url="https://query.wikidata.org/sparql?"+new URLSearchParams({query:query(limit,offset),format:"json"});
 for(let i=0;i<4;i++){
  const res=await fetch(url,{headers:{"Accept":"application/sparql-results+json","User-Agent":"ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/)"}});
  if(res.status===429){await wait(Math.min(60,Math.max(2,Number(res.headers.get("Retry-After")||10)))*1000);continue;}
  if([500,502,503,504].includes(res.status)&&i<3){await wait((i+1)*2500);continue;}
  if(!res.ok)throw new Error("Wikidata Query Service HTTP "+res.status);
  const data=await res.json();return Array.isArray(data?.results?.bindings)?data.results.bindings:[];
 }
 throw new Error("Wikidata Query Service remained unavailable.");
}
function mapRow(b:any){
 const qid=String(b?.item?.value||"").match(/(Q\d+)$/)?.[1]||"";
 const label=String(b?.itemLabel?.value||"").trim().slice(0,500);
 const ja=String(b?.jaLabel?.value||"").trim().slice(0,500);
 const titleJa=ja||(/[\u3000-\u30ff\u3400-\u9fff]/.test(label)?label:null);
 const title=titleJa||label;
 const date=String(b?.date?.value||"").match(/^(\d{4})/);
 const year=date?Number(date[1]):null;
 const cls=String(b?.class?.value||"").match(/(Q\d+)$/)?.[1]||"";
 const episodes=Number(b?.episodes?.value);
 if(!/^Q\d+$/.test(qid)||!title||!year||year<1963)return null;
 return {source:"wikidata",source_id:qid,title,title_ja:titleJa,format:formats[cls]||"other",release_year:year,country_code:"JP",episode_count:Number.isInteger(episodes)&&episodes>0?episodes:null,episodes_count:Number.isInteger(episodes)&&episodes>0?episodes:null,source_synced_at:new Date().toISOString()};
}
async function digestHex(value:string){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin");
 if(origin&&origin!==allowedOrigin)return json({error:"Origin not allowed"},403);
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return json({error:"Supabase server configuration is incomplete."},500);
 try{
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let authorized=false;
  const token=req.headers.get("x-anixia-cron-token");
  if(token){
   const check=await db.from("catalog_sync_secrets").select("secret_hash").eq("id",1).maybeSingle();
   if(check.error)throw check.error;
   const hash=await digestHex(token);
   authorized=Boolean(check.data?.secret_hash)&&hash===check.data.secret_hash;
  }
  if(!authorized){
   const auth=req.headers.get("Authorization");
   if(!auth?.startsWith("Bearer "))return json({error:"管理者ログインまたは有効な同期トークンが必要です。"},401);
   const userClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:auth}}});
   const user=await userClient.auth.getUser();
   if(user.error||!user.data.user)return json({error:"ログイン状態を確認できません。"},401);
   const adminCheck=await userClient.rpc("is_anixia_admin");
   if(adminCheck.error||adminCheck.data!==true)return json({error:"ANIXIA管理者権限が必要です。"},403);
  }
  const source=await db.from("catalog_sources").select("rights_review_status,is_enabled").eq("code","wikidata").single();
  if(source.error)throw source.error;
  if(!source.data?.is_enabled||source.data.rights_review_status!=="approved")return json({error:"Wikidataの利用承認が有効ではないため、同期を停止しました。"},423);
  const body=await req.json().catch(()=>({}));
  const mode=body?.mode==="preview"?"preview":"sync";
  const limit=Math.min(100,Math.max(10,Math.floor(Number(body?.limit)||50)));
  const state=await db.from("catalog_sync_state").select("next_offset").eq("source","wikidata").single();
  if(state.error)throw state.error;
  const offset=Math.max(0,Number(state.data?.next_offset)||0);
  const bindings=await fetchPage(limit,offset),map=new Map<string,any>();
  for(const b of bindings){const row=mapRow(b);if(row&&!map.has(row.source_id))map.set(row.source_id,row);}
  const rows=[...map.values()];
  if(mode==="preview"){
   const ids=rows.map(x=>x.source_id);
   const found=ids.length?await db.from("anime").select("source_id,is_published").eq("source","wikidata").in("source_id",ids):{data:[],error:null};
   if(found.error)throw found.error;
   const existing=new Map((found.data||[]).map((x:any)=>[String(x.source_id),Boolean(x.is_published)]));
   return json({mode,offset,recordsSeen:bindings.length,candidates:rows.map(x=>({sourceId:x.source_id,title:x.title,titleJa:x.title_ja,format:x.format,releaseYear:x.release_year,episodeCount:x.episode_count,alreadyImported:existing.has(x.source_id),alreadyPublished:existing.get(x.source_id)===true,wikidataUrl:"https://www.wikidata.org/wiki/"+x.source_id}))});
  }
  const run=await db.from("catalog_sync_runs").insert({source:"wikidata",status:"running",pages_requested:0,records_seen:0,records_inserted_or_updated:0}).select("id").single();
  if(run.error)throw run.error;
  try{
   const saved=rows.length?await db.from("anime").upsert(rows,{onConflict:"source,source_id",ignoreDuplicates:true}).select("id"):{data:[],error:null};
   if(saved.error)throw saved.error;
   if(rows.length){
    const sourceIds=rows.map(row=>row.source_id);
    const imported=await db.from("anime").select("id,source_id").eq("source","wikidata").in("source_id",sourceIds);
    if(imported.error)throw imported.error;
    const externalIds=(imported.data||[]).map((row:any)=>({
     anime_id:row.id,
     source:"wikidata",
     external_id:String(row.source_id),
     source_url:"https://www.wikidata.org/wiki/"+String(row.source_id),
     is_primary:true,
     last_verified_at:new Date().toISOString()
    }));
    if(externalIds.length){
     const mapped=await db.from("anime_external_ids").upsert(externalIds,{onConflict:"source,external_id",ignoreDuplicates:true});
     if(mapped.error)throw mapped.error;
    }
   }
   const next=bindings.length>=limit?offset+limit:0,now=new Date().toISOString();
   const stateUpdate=await db.from("catalog_sync_state").update({next_offset:next,last_success_at:now,updated_at:now}).eq("source","wikidata");
   if(stateUpdate.error)throw stateUpdate.error;
   const inserted=saved.data?.length||0;
   const finish=await db.from("catalog_sync_runs").update({finished_at:now,status:"succeeded",pages_requested:1,records_seen:bindings.length,records_inserted_or_updated:inserted}).eq("id",run.data.id);
   if(finish.error)throw finish.error;
   return json({status:"completed",offset,nextOffset:next,recordsSeen:bindings.length,validCandidates:rows.length,recordsInsertedOrUpdated:inserted,sweepRestarted:next===0});
  }catch(error){
   await db.from("catalog_sync_runs").update({finished_at:new Date().toISOString(),status:"failed",pages_requested:1,records_seen:bindings.length,error_message:JSON.stringify(error).slice(0,1000)}).eq("id",run.data.id);
   throw error;
  }
 }catch(error){console.error("ANIXIA Wikidata sync failed:",error);return json({error:"Wikidata作品同期に失敗しました。Edge Functionログを確認してください。"},500);}
});