"""Targeted 0.19.1 -> 0.20.0 build. Run from any working directory; no network."""
from pathlib import Path
import json,runpy,re
root=Path(__file__).resolve().parent
runpy.run_path(str(root/'patch_modules.py'))
s=(root/'baseline_0.19.1.html').read_text()
for name in ['fortress','base','lighting','turret','building']:
 old=(root/(name+'_original.js')).read_text();new=(root/(name+'.js')).read_text();assert s.count(old)==1,name;s=s.replace(old,new)
art=json.loads((root/'art_frames.json').read_text())
module=(root/'walls020.js').read_text().replace('__ART_FRAMES_020__',json.dumps(art,separators=(',',':')))
needle='/* 0.9.2: four watchtowers';assert s.count(needle)==1;s=s.replace(needle,module+'\n'+needle)
# Corners belong to their two fronts; preserve the existing independent raid squads.
old="const eligible=o=>o.side===r.side&&(inside?o.group==='inner':['outer','gate'].includes(o.group)&&o.id!=='v091innerGate');"
assert s.count(old)==1
s=s.replace(old,"const eligible=o=>(o.sides?o.sides.includes(r.side):o.side===r.side)&&(inside?o.group==='inner':['outer','gate'].includes(o.group)&&o.id!=='v091innerGate');")
old="if(o.side!==r.side||(inner?o.group!=='inner':!['outer','gate'].includes(o.group)||o.id==='v091innerGate')||o.hp>0&&!V015Base.isOpen(o))continue;"
assert s.count(old)==1
s=s.replace(old,"if(!(o.sides?o.sides.includes(r.side):o.side===r.side)||(inner?o.group!=='inner':!['outer','gate'].includes(o.group)||o.id==='v091innerGate')||o.hp>0&&!V015Base.isOpen(o))continue;")
corner_route="""      if(o.corner){
        const nx=o.corner.includes('W')?-1:1,ny=o.corner.includes('N')?-1:1,cx=o.x+o.w/2,cy=o.y+o.h/2,offset=o.w/2+z.radius+12;
        const outside={x:cx+nx*offset,y:cy+ny*offset},inside={x:cx-nx*(o.w/2+6),y:cy-ny*(o.h/2+6)},d=dist(z,outside);
        if(d<cost&&(!wall||d<dist(z,wallApproach(z,wall))+150)&&lineClear(outside.x,outside.y,inside.x,inside.y,z.radius,'surface')&&lineClear(z.x,z.y,outside.x,outside.y,z.radius,'surface')){best={wall:o,outside,inside};cost=d;}
        continue;
      }
"""
old="const vertical=o.side==='W'||o.side==='E',margin=Math.max(0,((vertical?o.h:o.w)-z.radius*2-8)/2),nx=o.side==='W'?-1:o.side==='E'?1:0,ny=o.side==='N'?-1:o.side==='S'?1:0;"
assert s.count(old)==1
s=s.replace(old,corner_route+"      const vertical=r.side==='W'||r.side==='E',margin=Math.max(0,((vertical?o.h:o.w)-z.radius*2-8)/2),nx=r.side==='W'?-1:r.side==='E'?1:0,ny=r.side==='N'?-1:r.side==='S'?1:0;")
for old,new in [("gameVersion='0.19.1'","gameVersion='0.20.0'"),('VERSION 0.19.1','VERSION 0.20.0'),('Version 0.19.1','Version 0.20.0'),('Survival Base 0.19.1','Survival Base 0.20.0'),('<title>0.19.1','<title>0.20.0'),('survival-base-0.19.1-','survival-base-0.20.0-')]:s=s.replace(old,new)
s=s.replace("['0.19.1',{'Улучшения'", "['0.20.0',{'Новое':['Периметр: 4 угла, 11 стен и одни южные ворота.','16 лестниц с плавным подъёмом. Со стены можно спрыгнуть только во двор.','Пять обликов укреплений и три стадии трещин.'],'Улучшения':['Пулемёт устанавливается в любой точке стены, включая стыки.','Сохранены уровни укреплений, повреждения и установленные пулемёты из предыдущей версии.']}], ['0.19.1',{'Улучшения'")
# Only release-label migration: older saves are still accepted by existing codecs.
s=s.replace(r'19\.[01]',r'(?:19\.[01]|20\.0)')
out=root.parent/'index.html';out.write_text(s)
paths=set(re.findall(r'assets/(?:v0190|v0200)/[A-Za-z0-9_]+\.(?:png|webp)',s))
assert len(paths)==99,len(paths)
for path in paths:assert (root.parent/path).is_file(),path
assert out.stat().st_size<25*1024**2
print(json.dumps({'version':'0.20.0','htmlBytes':out.stat().st_size,'images':len(paths)}))
