#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'apps'];
const skip = ['/components/ui/button.tsx'];

function* walk(dir){
  if(!fs.existsSync(dir)) return;
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const f=path.join(dir,e.name);
    if(e.isDirectory()){
      if(['node_modules','.next','generated'].includes(e.name)) continue;
      yield* walk(f);
    } else if(e.isFile() && e.name.endsWith('.tsx')) yield f;
  }
}

function pickVariant(tag){
  const t=tag;
  if(/\bvariant\s*=/.test(t)) return null;
  if(/\bdisabled\b/.test(t) && !/\btype\s*=\s*['"]submit['"]/.test(t)) return 'disabled';
  if(/\btype\s*=\s*['"]submit['"]/.test(t)) return 'primary';
  if(/df-btn-primary|bg-primary|text-primary-foreground/.test(t)) return 'primary';
  if(/df-btn-ghost|icon|aria-label|size-\d|p-0|px-0/.test(t)) return 'ghost';
  return 'secondary';
}

let files=0, tags=0;
for(const r of roots){
  for(const file of walk(path.join(process.cwd(), r))){
    const rel=file.replace(process.cwd()+path.sep,'');
    if(skip.some(s=>rel.endsWith(s))) continue;
    let src=fs.readFileSync(file,'utf8');
    let changed=false;
    src = src.replace(/<Button\b([\s\S]*?)>/g, (m, attrs)=>{
      if(/\bvariant\s*=/.test(m)) return m;
      const v=pickVariant(m);
      changed=true; tags++;
      return `<Button variant=\"${v}\"${attrs}>`;
    });
    if(changed){
      fs.writeFileSync(file,src,'utf8');
      files++;
      console.log(rel);
    }
  }
}
console.log(`\n[fix-button-variant] files=${files} tags=${tags}`);
