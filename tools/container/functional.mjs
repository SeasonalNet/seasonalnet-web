import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';
const app=process.env.PROBE_APP;
const mock=http.createServer((req,res)=>{res.setHeader('content-type','application/json');
 if(req.url.startsWith('/v1/public/announcements'))res.end(JSON.stringify({data:[{id:'fixture',title:'Functional announcement',body:'Fixture body',sites:[]}],meta:{count:1}}));
 else if(req.url==='/nowplaying')res.end(JSON.stringify([['title','Fixture song'],['artist','Fixture artist']]));
 else{res.statusCode=404;res.end('{}');}
});
await new Promise(r=>mock.listen(0,'127.0.0.1',r));
const fixture=`http://127.0.0.1:${mock.address().port}`;
const child=spawn('/nodejs/bin/node',['/app/launch.mjs'],{env:{...process.env,HOSTNAME:'127.0.0.1',SEASONAL_APID_BASE_URL:fixture,SEASONALWEATHER_NOWPLAYING_URL:fixture+'/nowplaying',AUTH_SECRET:'synthetic-container-test-secret-32chars',AUTH_TRUST_HOST:'true',AUTH_AUTHENTIK_ID:'fixture',AUTH_AUTHENTIK_SECRET:'fixture',AUTH_AUTHENTIK_ISSUER:fixture},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>{output+=x});child.stderr.on('data',x=>{output+=x});
const base='http://127.0.0.1:3000';
async function get(path,status=200){const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(10000)});const body=await r.text();assert.equal(r.status,status,`${app} ${path}: ${body.slice(0,350)}\n${output}`);return {r,body};}
try{
 for(let i=0;i<100;i++){try{await fetch(base,{redirect:'manual',signal:AbortSignal.timeout(1000)});break;}catch(e){if(i===99)throw e;await new Promise(r=>setTimeout(r,100));}}
 const root=await fetch(base,{redirect:'manual'});assert.ok(root.status<400,`${app} root: ${root.status}`);const html=root.status===200?await root.text():(await get(app==='docs'?'/docs':'/login')).body;
 assert.match(html,/<html/);
 const assets=[...new Set([...html.matchAll(/(?:src|href)="([^"#]*\/_next\/static\/[^"#]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')))];assert.ok(assets.length>0,`${app}: no Next assets in HTML`);
 for(const asset of assets){const u=new URL(asset,base);assert.equal(u.origin,base);const {r,body}=await get(u.pathname+u.search);assert.ok(body.length>0);assert.ok(!r.headers.get('content-type')?.includes('text/html'),asset);}
 await get('/api/openapi.json',['admin','agent'].includes(app)?307:200);
 if(['www','radio','prov','docs','pbx'].includes(app)){
  const announcements=await get('/api/announcements');assert.match(announcements.body,/Functional announcement/);
 }
 if(['admin','agent','pbx'].includes(app)){
  const session=await get('/api/auth/session');assert.equal(session.body,'null');
  const csrf=await get('/api/auth/csrf');assert.ok(JSON.parse(csrf.body).csrfToken);assert.ok(csrf.r.headers.get('set-cookie'));
  const path={admin:'/api/modules/seasonalweather/overview',agent:'/api/agent/health',pbx:'/api/pbx/self'}[app];const denied=await get(path,307);assert.ok(new URL(denied.r.headers.get('location'),base).pathname==='/login');
 }
 if(app==='radio'){const meta=await get('/api/stations/jetstream/metadata');assert.match(meta.body,/Fixture song/);}
 for(const format of ['webp','avif']){
  const r=await fetch(base+'/_next/image?url=%2Ffavicon-192.png&w=64&q=75',{headers:{accept:'image/'+format},signal:AbortSignal.timeout(10000)});assert.equal(r.status,200);assert.ok(r.headers.get('content-type').startsWith('image/'));assert.ok((await r.arrayBuffer()).byteLength>0);
 }
 console.log(`PASS ${app}: rendered HTML, ${assets.length} JS/CSS/font asset URLs, OpenAPI, mock announcements where supported, auth session/CSRF/denial where applicable, radio metadata where applicable, native optimized image requests`);
}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));await new Promise(r=>mock.close(r));}
