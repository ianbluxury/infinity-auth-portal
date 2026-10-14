import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const sb=createClient("https://yfzqzrrxapdkotqklegg.supabase.co","sb_publishable_AYOq03QOCWQyNzyU7VqM6w_bDqGNh0G",{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const q=s=>document.querySelector(s),status=q("#status"),login=q("#login"),consent=q("#consent");
const id=new URL(location.href).searchParams.get("authorization_id");
let pending=false;
const showError=e=>{status.textContent=e?.message||String(e);};
const safeGo=url=>{const u=new URL(url);if(u.protocol!=="https:")throw Error("Unexpected redirect scheme");location.assign(u.href)};
async function load(){
 if(!id||!/^[a-zA-Z0-9_-]{8,256}$/.test(id)){status.textContent="Missing or invalid authorization request.";return}
 const {data:{user},error}=await sb.auth.getUser();
 if(error||!user){status.textContent="Sign in to review this authorization request.";login.hidden=false;return}
 const {data,error:detailsError}=await sb.auth.oauth.getAuthorizationDetails(id);
 if(detailsError||!data){showError(detailsError||"Authorization request not found.");return}
 if(!("authorization_id" in data)){safeGo(data.redirect_url);return}
 const client=data.client||{};
 q("#client").textContent=client.name||data.client_name||"Unnamed OAuth client";
 q("#scopes").textContent=data.scope||"Unspecified";
 q("#destination").textContent=(data.redirect_uri||client.redirect_uri||"Not provided");
 status.textContent="Review the application and permissions before deciding.";
 consent.hidden=false;
}
q("#send").addEventListener("click",async()=>{
 const email=q("#email").value.trim();if(!email)return;
 q("#send").disabled=true;
 const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.href,shouldCreateUser:false}});
 status.textContent=error?"Sign-in request failed: "+error.message:"Check your email. Open the sign-in link in this browser.";
 q("#send").disabled=false;
});
async function decide(allow){
 if(pending)return;pending=true;q("#approve").disabled=q("#deny").disabled=true;
 status.textContent=allow?"Approving request…":"Denying request…";
 const {data,error}=await(allow?sb.auth.oauth.approveAuthorization(id):sb.auth.oauth.denyAuthorization(id));
 if(error||!data?.redirect_url){showError(error||"No redirect returned");pending=false;q("#approve").disabled=q("#deny").disabled=false;return}
 try{safeGo(data.redirect_url)}catch(e){showError(e)}
}
q("#approve").addEventListener("click",()=>decide(true));
q("#deny").addEventListener("click",()=>decide(false));
await load();