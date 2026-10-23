"""Test all seven already-built SPA images; optional argument is their shared tag."""
from pathlib import Path
import subprocess,concurrent.futures,sys
root=Path(__file__).parent
source=(root/'functional.mjs').read_text()
def run(app):
 p=subprocess.run(['docker','run','--rm','--interactive','--network','none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges:true','--tmpfs','/tmp:rw,noexec,nosuid,nodev,mode=1777','--tmpfs',f'/app/apps/{app}/.next/cache:rw,noexec,nosuid,nodev,uid=10001,gid=10001','-e','PROBE_APP='+app,'seasonalnet-web-'+app+':'+(sys.argv[1] if len(sys.argv)>1 else 'local'),'/nodejs/bin/node','--input-type=module','-'],input=source,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=120)
 print(app,p.returncode,p.stdout[-2000:],flush=True);return p.returncode
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(run,['www','radio','prov','docs','pbx','admin','agent']))
assert not any(results),results
