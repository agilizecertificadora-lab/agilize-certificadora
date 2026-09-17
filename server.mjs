import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.jpeg':'image/jpeg', '.png':'image/png' };
const port=Number(process.env.AGILIZE_PORT||4173);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const readJson=req=>new Promise((resolveBody,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>200000)reject(new Error('too-large'));});req.on('end',()=>{try{resolveBody(JSON.parse(body));}catch(error){reject(error);}});});
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname==='/api/availability'&&req.method==='GET'){
      const url=new URL(req.url,'http://localhost');const mode=url.searchParams.get('mode')||'Online';const date=url.searchParams.get('date');const day=new Date(`${date}T12:00:00`).getDay();
      const slots=mode.startsWith('Presencial')?(day===0||day===6?[]:['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00']):['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
      json(res,200,{slots});return;
    }
    if(pathname==='/api/orders'&&req.method==='POST'){
      const body=await readJson(req);if(!body.holder||!body.date||!body.time){json(res,400,{message:'Preencha todos os campos obrigatórios.'});return;}
      const protocol=`AGZ-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
      json(res,201,{protocol,status:'local_preview'});return;
    }
    const publicPath = pathname === '/' ? '/index.html' : pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const path = resolve(root, '.' + publicPath);
    if (!path.startsWith(resolve(root) + sep)) { res.writeHead(403).end(); return; }
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }); res.end(content);
  } catch { res.writeHead(404).end('Página não encontrada'); }
}).listen(port, '127.0.0.1', () => console.log(`Agilize: http://127.0.0.1:${port}`));

