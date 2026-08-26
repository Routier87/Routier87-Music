/*
 ROUTIER 87 — V9 SYNC SERVER
 No Supabase / no Firebase.
 Deploy this Node server on any host supporting WebSockets.
 GitHub Pages hosts only index.html.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 8080;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const FILE_DIR = path.join(DATA_DIR, "files");
const STATE_FILE = path.join(DATA_DIR, "state.json");

fs.mkdirSync(FILE_DIR, {recursive:true});

const defaultState = {
  tracks: [], reactions: {}, comments: {}, activity: [],
  profiles: {
    Routier87:{display:"Routier 87",creator:true},
    Benjamin:{display:"Benjamin"}, Samantha:{display:"Samantha"},
    "Océane":{display:"Océane"}, Chico:{display:"Chico"},
    Tristan:{display:"Tristan"}, Manon:{display:"Manon"},
    "Éric":{display:"Éric"}, Mr_Wolf:{display:"Mr_Wolf"},
    "F-O-T":{display:"Far Motors Transport"}
  }
};

function readState(){
  try{return JSON.parse(fs.readFileSync(STATE_FILE,"utf8"))}
  catch(e){fs.writeFileSync(STATE_FILE,JSON.stringify(defaultState,null,2));return structuredClone(defaultState)}
}
let state=readState();

function saveState(){
  const tmp=STATE_FILE+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(state,null,2));
  fs.renameSync(tmp,STATE_FILE);
}
function broadcast(obj, except=null){
  const s=JSON.stringify(obj);
  wss.clients.forEach(c=>{
    if(c!==except && c.readyState===1)c.send(s);
  });
}
function safeId(v){
  return String(v||"").replace(/[^a-zA-Z0-9_.-]/g,"_").slice(0,180);
}
function filePath(id){return path.join(FILE_DIR,safeId(id)+".bin")}
function metaPath(id){return path.join(FILE_DIR,safeId(id)+".json")}

const server=http.createServer((req,res)=>{
  if(req.url==="/health"){
    res.writeHead(200,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"});
    return res.end(JSON.stringify({ok:true,version:"9.0",clients:wss.clients.size}));
  }
  res.writeHead(404);res.end("WebSocket server — Routier 87 V9");
});

const wss=new WebSocketServer({server,maxPayload:50*1024*1024});

wss.on("connection",ws=>{
  ws.send(JSON.stringify({type:"state",state}));
  ws.on("message",(raw)=>{
    try{
      const m=JSON.parse(raw.toString());

      if(m.type==="hello"){
        ws.user=m.user||"unknown";
        return;
      }

      if(m.type==="patch"){
        applyPatch(m.patch);
        saveState();
        broadcast({type:"patch",patch:m.patch},ws);
        ws.send(JSON.stringify({type:"ack"}));
        return;
      }

      if(m.type==="replaceState"){
        // Creator-only check should be strengthened with real authentication
        // before public production deployment.
        if(ws.user!=="Routier87")return ws.send(JSON.stringify({type:"error",message:"Seul Routier 87 peut restaurer une sauvegarde."}));
        if(m.state && typeof m.state==="object"){
          state=m.state;saveState();broadcast({type:"state",state});
        }
        return;
      }

      if(m.type==="upload"){
        const id=safeId(m.id);
        const data=String(m.data||"");
        const comma=data.indexOf(",");
        if(comma<0)return;
        const rawb=Buffer.from(data.slice(comma+1),"base64");
        if(rawb.length>50*1024*1024)return ws.send(JSON.stringify({type:"error",message:"Fichier trop volumineux (50 Mo max)."}));
        fs.writeFileSync(filePath(id),rawb);
        fs.writeFileSync(metaPath(id),JSON.stringify({name:m.name||id,mime:m.mime||"application/octet-stream",kind:m.kind||"file"}));
        return;
      }

      if(m.type==="download"){
        const id=safeId(m.id), fp=filePath(id);
        if(!fs.existsSync(fp))return ws.send(JSON.stringify({type:"error",message:"Fichier introuvable sur le serveur."}));
        const meta=fs.existsSync(metaPath(id))?JSON.parse(fs.readFileSync(metaPath(id),"utf8")):{mime:"application/octet-stream"};
        const data="data:"+(meta.mime||"application/octet-stream")+";base64,"+fs.readFileSync(fp).toString("base64");
        ws.send(JSON.stringify({type:"file",id,data,name:meta.name,mime:meta.mime}));
      }
    }catch(e){
      console.error(e);
      try{ws.send(JSON.stringify({type:"error",message:"Requête invalide."}))}catch(_){}
    }
  });
});

function applyPatch(p){
  if(!p)return;
  if(p.op==="upsertTrack"){
    const i=state.tracks.findIndex(t=>t.id===p.track.id);
    if(i<0)state.tracks.push(p.track);else state.tracks[i]={...state.tracks[i],...p.track};
  } else if(p.op==="deleteTrack"){
    state.tracks=state.tracks.filter(t=>t.id!==p.id);
    delete state.reactions[p.id];delete state.comments[p.id];
  } else if(p.op==="reaction"){
    state.reactions[p.id]??={};
    if(p.value==null)delete state.reactions[p.id][p.user];
    else state.reactions[p.id][p.user]=p.value;
  } else if(p.op==="comment"){
    state.comments[p.id]??=[];state.comments[p.id].push(p.comment);
  } else if(p.op==="activity"){
    state.activity.unshift(p.activity);state.activity=state.activity.slice(0,100);
  } else if(p.op==="profile"){
    state.profiles[p.id]=p.profile;
  }
}

server.listen(PORT,()=>console.log(`Routier 87 V9 Sync Server listening on :${PORT}`));
