const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function generate(check=false){
 const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const html=source.replace('<title>','<title>DEVELOPER · ').replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>','<script src="dev/storage.js"></script>\n<script src="https://telegram.org/js/telegram-web-app.js"></script>').replace(/<script src="js\/game\.js[^"\n]*"><\/script>/,'<script src="dev/launch.js"></script>');
 const target=path.join(root,'dev.html');if(check){if(fs.readFileSync(target,'utf8')!==html)throw Error('Developer entry is stale');}else fs.writeFileSync(target,html);
}module.exports={generate};
