// No transpiler, minifier, framework, or runtime loader. Preserve the original
// classic-script scope, declaration hoisting and side-effect order byte for byte.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json')));
const check=process.argv.includes('--check'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
require('./assets.cjs').generate(check);
if(manifest.mode!=='classic-script-concatenation'||new Set(manifest.files).size!==manifest.files.length)throw Error('Invalid source manifest');
const parts=manifest.files.map(file=>{
 if(path.isAbsolute(file)||file.split('/').includes('..')||!file.endsWith('.js'))throw Error('Invalid source path: '+file);
 const text=fs.readFileSync(path.join(root,'src',file),'utf8');
 if(!text.endsWith('\n'))throw Error('Source sections must end with a newline: '+file);
 return text;
});
const body=parts.join('');new vm.Script(body,{filename:'js/game.js'});
const trailer='\n//# sourceMappingURL=game.js.map\n',bundle=body+trailer;
// A direct line mapping: there is no transformation within a source section.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function vlq(n){let v=n<0?((-n)<<1)|1:n<<1,out='';do{let d=v&31;v>>>=5;if(v)d|=32;out+=alphabet[d];}while(v);return out;}
let previousSource=0,previousLine=0;const mappings=[];
parts.forEach((text,source)=>{
 const lines=text.split('\n').length-1;
 for(let line=0;line<lines;line++){
  mappings.push('A'+vlq(source-previousSource)+vlq(line-previousLine)+'A');previousSource=source;previousLine=line;
 }
});
const map={version:3,file:'game.js',sourceRoot:'../src/',sources:manifest.files,names:[],mappings:mappings.join(';'),sourcesContent:parts};
const info={version:manifest.version,format:manifest.mode,bodySha256:hash(body),bundleSha256:hash(bundle),files:manifest.files.map((file,i)=>({file:'src/'+file,bytes:Buffer.byteLength(parts[i]),sha256:hash(parts[i])}))};
for(const [file,content]of [['js/game.js',bundle],['js/game.js.map',JSON.stringify(map)+'\n'],['js/build-info.json',JSON.stringify(info,null,2)+'\n']]){
 const target=path.join(root,file);
 if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content)throw Error('Build is stale: '+file);}
 else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}
}
console.log((check?'Verified':'Built')+' '+manifest.files.length+' source sections; '+Buffer.byteLength(bundle)+' runtime JS bytes.');
