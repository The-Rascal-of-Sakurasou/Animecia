import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
const allowedOrigin="https://the-rascal-of-sakurasou.github.io";
const headers={"Access-Control-Allow-Origin":allowedOrigin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-anixia-cron-token","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json; charset=utf-8"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const formats:Record<string,string>={"Q63952888":"tv","Q20650540":"movie","Q220898":"ova","Q1047299":"ona","Q117209498":"movie","Q117467240":"web","Q11086742":"tv","Q113671041":"ona","Q113687694":"ova","Q117467246":"tv","Q117717390":"movie","Q1261214":"special"};
const query=(limit:number,offset:number)=>
"SELECT ?item ?itemLabel ?jaLabel ?date ?episodes (GROUP_CONCAT(DISTINCT STR(?class);separator=\"|\") AS ?classes) WHERE {"+
" VALUES ?class { wd:Q63952888 wd:Q20650540 wd:Q220898 wd:Q1047299 wd:Q117209498 wd:Q117467240 wd:Q11086742 wd:Q113671041 wd:Q113687694 wd:Q117467246 wd:Q117717390 wd:Q1261214 }"+
" ?item wdt:P31 ?class ; wdt:P495 wd:Q17 ."+
" FILTER(?class != wd:Q1261214 || EXISTS { ?item wdt:P136/wdt:P279* wd:Q1107 } || EXISTS { ?item wdt:P2079 wd:Q11425 })"+
" OPTIONAL { ?item wdt:P580 ?startDate . } OPTIONAL { ?item wdt:P577 ?publicationDate . }"+
" BIND(COALESCE(?startDate, ?publicationDate) AS ?date) FILTER(BOUND(?date) && YEAR(?date)>=1963)"+
" FILTER NOT EXISTS { ?item wdt:P136 ?adultGenre . VALUES ?adultGenre { wd:Q136926229 wd:Q49148153 wd:Q185529 wd:Q599558 wd:Q2275499 wd:Q16254232 wd:Q2292320 wd:Q172067 } }"+
" OPTIONAL { ?item wdt:P1113 ?episodes . }"+
" OPTIONAL { ?item rdfs:label ?jaLabel . FILTER(LANG(?jaLabel)='ja') }"+
" SERVICE wikibase:label { bd:serviceParam wikibase:language 'ja,en'. }"+
" } GROUP BY ?item ?itemLabel ?jaLabel ?date ?episodes ORDER BY ?item LIMIT "+limit+" OFFSET "+offset;
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
 const classes=String(b?.classes?.value||"").split("|").map((value:string)=>value.match(/(Q\d+)$/)?.[1]||"").filter(Boolean);
 const priority=["Q1261214","Q113687694","Q220898","Q113671041","Q1047299","Q63952888","Q11086742","Q117467246","Q117717390","Q20650540","Q117209498","Q117467240"];
 const cls=priority.find(value=>classes.includes(value))||classes[0]||"";
 const episodes=Number(b?.episodes?.value);
 if(!/^Q\d+$/.test(qid)||!title||!year||year<1963)return null;
 const format=formats[cls]||"other";
 const publishable=Boolean(titleJa)&&["tv","movie","ova","ona","web","special"].includes(format);
 return {source:"wikidata",source_id:qid,title,title_ja:titleJa,format,release_year:year,country_code:"JP",episode_count:Number.isInteger(episodes)&&episodes>0?episodes:null,episodes_count:Number.isInteger(episodes)&&episodes>0?episodes:null,is_published:publishable,source_synced_at:new Date().toISOString()};
}
async function digestHex(value:string){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("");
}
async function fetchMalIds(qids:string[]){
 const found=new Map<string,Set<string>>();
 for(let start=0;start<qids.length;start+=40){
  const batch=qids.slice(start,start+40).filter(qid=>/^Q[0-9]+$/.test(qid));
  if(!batch.length)continue;
  const values=batch.map(qid=>"wd:"+qid).join(" ");
  const sparql="SELECT ?item ?malId WHERE { VALUES ?item { "+values+" } ?item wdt:P4086 ?malId . } ORDER BY ?item ?malId";
  const endpoint="https://query.wikidata.org/sparql?"+new URLSearchParams({query:sparql,format:"json"});
  let bindings:any[]=[],requestSucceeded=false;
  for(let attempt=0;attempt<4;attempt++){
   const response=await fetch(endpoint,{headers:{"Accept":"application/sparql-results+json","User-Agent":"ANIXIA/1.0 (https://the-rascal-of-sakurasou.github.io/anixia/)"}});
   if(response.status===429){await wait(Math.min(60,Math.max(2,Number(response.headers.get("Retry-After")||10)))*1000);continue;}
   if([500,502,503,504].includes(response.status)&&attempt<3){await wait((attempt+1)*2500);continue;}
   if(!response.ok)throw new Error("Wikidata MAL-ID lookup HTTP "+response.status);
   const payload=await response.json();bindings=Array.isArray(payload?.results?.bindings)?payload.results.bindings:[];requestSucceeded=true;break;
  }
  if(!requestSucceeded)throw new Error("Wikidata MAL-ID lookup failed after retries.");
  if(!bindings.length)continue;
  for(const binding of bindings){
   const qid=String(binding?.item?.value||"").match(/(Q[0-9]+)$/)?.[1];
   const malId=String(binding?.malId?.value||"").trim();
   if(!qid||!/^[0-9]+$/.test(malId))continue;
   if(!found.has(qid))found.set(qid,new Set());
   found.get(qid)!.add(malId);
  }
  if(start+40<qids.length)await wait(1200);
 }
 return found;
}
async function persistMalMappings(db:any,works:any[]){
 const validWorks=works.filter((row:any)=>row?.id&&/^Q[0-9]+$/.test(String(row.source_id||"")));
 if(!validWorks.length)return {linked:0,alreadyLinked:0,missing:0,ambiguous:0,collision:0,idsFound:0};
 const malByQid=await fetchMalIds(validWorks.map((row:any)=>String(row.source_id)));
 const existingResult=await db.from("anime_external_ids").select("anime_id,external_id").eq("source","myanimelist").limit(5000);
 if(existingResult.error)throw existingResult.error;
 const assignedByAnime=new Map<string,string>();
 const assignedByMal=new Map<string,string>();
 for(const row of existingResult.data||[]){
  assignedByAnime.set(String(row.anime_id),String(row.external_id));
  assignedByMal.set(String(row.external_id),String(row.anime_id));
 }
 const inserts:any[]=[];
 let alreadyLinked=0,missing=0,ambiguous=0,collision=0;
 for(const work of validWorks){
  const animeId=String(work.id),qid=String(work.source_id),ids=malByQid.get(qid);
  if(!ids||ids.size===0){missing++;continue;}
  if(ids.size!==1){ambiguous++;continue;}
  const malId=[...ids][0],sameAnime=assignedByAnime.get(animeId);
  if(sameAnime){if(sameAnime===malId)alreadyLinked++;else collision++;continue;}
  if(assignedByMal.has(malId)){collision++;continue;}
  inserts.push({anime_id:animeId,source:"myanimelist",external_id:malId,source_url:"https://myanimelist.net/anime/"+malId,is_primary:false,last_verified_at:new Date().toISOString()});
  assignedByAnime.set(animeId,malId);
  assignedByMal.set(malId,animeId);
 }
 if(inserts.length){
  const saved=await db.from("anime_external_ids").upsert(inserts,{onConflict:"source,external_id",ignoreDuplicates:true});
  if(saved.error)throw saved.error;
 }
 return {linked:inserts.length,alreadyLinked,missing,ambiguous,collision,idsFound:malByQid.size};
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
  if(body?.mode==="sync_mal_ids"){
   const worksResult=await db.from("anime").select("id,source_id")
    .eq("source","wikidata").not("source_id","is",null).order("source_id").limit(1000);
   if(worksResult.error)throw worksResult.error;
   const report=await persistMalMappings(db,worksResult.data||[]);
   return json({status:"completed",worksChecked:(worksResult.data||[]).length,wikidataMALIdsFound:report.idsFound,...report,sourceProperty:"Wikidata P4086"});
  }
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
   return json({mode,offset,recordsSeen:bindings.length,candidates:rows.map(x=>({sourceId:x.source_id,title:x.title,titleJa:x.title_ja,format:x.format,releaseYear:x.release_year,episodeCount:x.episode_count,autoPublishEligible:x.is_published,alreadyImported:existing.has(x.source_id),alreadyPublished:existing.get(x.source_id)===true,wikidataUrl:"https://www.wikidata.org/wiki/"+x.source_id}))});
  }
  const run=await db.from("catalog_sync_runs").insert({source:"wikidata",status:"running",pages_requested:0,records_seen:0,records_inserted_or_updated:0}).select("id").single();
  if(run.error)throw run.error;
  try{
   const saved=rows.length?await db.from("anime").upsert(rows,{onConflict:"source,source_id",ignoreDuplicates:true}).select("id"):{data:[],error:null};
   if(saved.error)throw saved.error;
   // Publish only high-confidence candidates with a Japanese title and a supported anime format; keep incomplete records private.
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
    const malMapping=await persistMalMappings(db,imported.data||[]);
    var malIdsLinked=malMapping.linked;
   }
   const next=bindings.length>=limit?offset+limit:0,now=new Date().toISOString();
   const stateUpdate=await db.from("catalog_sync_state").update({next_offset:next,last_success_at:now,updated_at:now}).eq("source","wikidata");
   if(stateUpdate.error)throw stateUpdate.error;
   const inserted=saved.data?.length||0;
   const finish=await db.from("catalog_sync_runs").update({finished_at:now,status:"succeeded",pages_requested:1,records_seen:bindings.length,records_inserted_or_updated:inserted}).eq("id",run.data.id);
   if(finish.error)throw finish.error;
   return json({status:"completed",offset,nextOffset:next,recordsSeen:bindings.length,validCandidates:rows.length,autoPublishEligible:rows.filter(row=>row.is_published).length,heldForMissingJapaneseTitleOrUnsupportedFormat:rows.filter(row=>!row.is_published).length,recordsInsertedOrUpdated:inserted,linkedMyAnimeListIds:typeof malIdsLinked==="number"?malIdsLinked:0,sweepRestarted:next===0});
  }catch(error){
   await db.from("catalog_sync_runs").update({finished_at:new Date().toISOString(),status:"failed",pages_requested:1,records_seen:bindings.length,error_message:JSON.stringify(error).slice(0,1000)}).eq("id",run.data.id);
   throw error;
  }
 }catch(error){console.error("ANIXIA Wikidata sync failed:",error);return json({error:"Wikidata作品同期に失敗しました。Edge Functionログを確認してください。"},500);}
});