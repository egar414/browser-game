"""Extend the shipped estuary north using an attributed OSM coast extract.
Usage: PYTHONPATH=/tmp/estuary-coast-tools python scripts/extend-northern-coast.py --extract /path/alexandra-osm.xml
The input map must be the pre-extension database (commit 7b5a163), or this
script exits without changes if that extension is already recorded.
"""
import argparse,gzip,json,math,xml.etree.ElementTree as ET
from pathlib import Path
from hashlib import sha256
from shapely.geometry import Polygon,LineString,Point,box
from shapely.ops import unary_union,polygonize
p=argparse.ArgumentParser();p.add_argument('--extract',type=Path,required=True);p.add_argument('--base',type=Path,default=Path('src/data/mooloolaba.json'));p.add_argument('--output',type=Path,default=Path('src/data/mooloolaba.json'));a=p.parse_args()
data=json.loads(a.base.read_text())
if data.get('coastalExtension'):print('Coastal extension already present; no changes.');raise SystemExit(0)
raw=gzip.decompress(a.extract.read_bytes()) if a.extract.suffix=='.gz' else a.extract.read_bytes()
root=ET.fromstring(raw);nodes={n.get('id'):n for n in root.findall('node')};ways=root.findall('way')
def tags(e):return{t.get('k'):t.get('v') for t in e.findall('tag')}
def xy(n):return((float(n.get('lon'))-153.124)*111320*math.cos(math.radians(26.694)),-(float(n.get('lat'))+26.694)*111320)
def coords(w):return[xy(nodes[n.get('ref')]) for n in w.findall('nd') if n.get('ref') in nodes]
def parts(g,kind):return[g] if g.geom_type==kind else[p for p in getattr(g,'geoms',[]) if p.geom_type==kind]
def rounded(ps):return[[round(x,1),round(z,1)]for x,z in ps]
w=data['world'];old_north=w['minZ'];north=round(-(26.694-26.653)*111320,1);strip=box(w['minX'],north,w['maxX'],old_north)
coast=unary_union([LineString(coords(q)).intersection(strip) for q in ways if tags(q).get('natural')=='coastline'])
regions=list(polygonize(unary_union([strip.boundary,coast])))
ocean=unary_union([r for r in regions if r.covers(Point(w['maxX']-20,(north+old_north)/2))])
assert ocean.area>strip.area*.25,'Coastline must divide the new strip'
new_land=strip.difference(ocean)
old_land=unary_union([Polygon(q['points'],q.get('holes',[]))for q in data['land']]);land=unary_union([old_land,new_land]).buffer(0)
lands=[]
for poly in parts(land,'Polygon'):
 old=max(data['land'],key=lambda q:Polygon(q['points'],q.get('holes',[])).intersection(poly).area)
 lands.append({**old,'points':rounded(poly.exterior.coords),'holes':[rounded(r.coords)for r in poly.interiors],'bounds':[round(v,1)for v in poly.bounds],'grass':[{'points':rounded(q.exterior.coords),'holes':[rounded(r.coords)for r in q.interiors]}for q in parts(poly.buffer(-4).simplify(1.5,preserve_topology=True),'Polygon')]})
data['land']=lands;w['minZ']=north
added={k:0 for k in ['buildings','roads','parks','beaches','pools']}
for way in ways:
 t=tags(way);cs=coords(way)
 if len(cs)<2:continue
 line=LineString(cs)
 if not line.intersects(strip):continue
 closed=len(cs)>=4 and cs[0]==cs[-1]
 if t.get('building') and t.get('building')!='no' and closed:
  poly=Polygon(cs).buffer(0)
  if poly.is_empty or poly.area<18 or not strip.covers(poly) or poly.distance(coast)>650:continue
  try:h=float((t.get('height')or'').split()[0]);hs='mapped height'
  except(ValueError,IndexError):
   try:h=float(t.get('building:levels','1'))*3.1;hs='mapped levels'if t.get('building:levels')else'estimate'
   except ValueError:h=4.5;hs='estimate'
  data['buildings'].append({'id':way.get('id'),'points':rounded(poly.exterior.coords),'h':round(max(3.5,min(h,52)),1),'name':t.get('name',''),'kind':t.get('building','yes'),'roofShape':t.get('roof:shape',''),'heightSource':hs,'coastalExtension':True});added['buildings']+=1
 if t.get('highway')in['residential','tertiary','secondary','primary','unclassified','service','cycleway','footway']and not t.get('bridge'):
  for seg in parts(line.intersection(strip),'LineString'):
   if seg.length<2:continue
   data['roads'].append({'points':rounded(seg.simplify(2).coords),'name':t.get('name',''),'kind':t['highway'],'w':3 if t['highway']in['cycleway','footway']else 9 if t['highway']in['primary','secondary']else 5});added['roads']+=1
 if closed and(t.get('natural')=='beach'or t.get('leisure')in['park','swimming_pool']):
  key='beaches'if t.get('natural')=='beach'else'pools'if t.get('leisure')=='swimming_pool'else'parks'
  for poly in parts(Polygon(cs).buffer(0).intersection(new_land),'Polygon'):
   if poly.area>6:data[key].append({'id':way.get('id'),'name':t.get('name','Coastal park'),'points':rounded(poly.exterior.coords)});added[key]+=1
# Real named landmarks, with fictional sign boards supplied by the renderer.
for n in root.findall('node'):
 t=tags(n)
 if t.get('natural')=='cape'and t.get('name')=='Alexandra Headland':x,z=xy(n);data['pois'].append({'name':t['name'],'x':round(x,1),'z':round(z,1),'coastal':True})
for way in ways:
 t=tags(way)
 if t.get('name')in['Alexandra Headland Surf Club','Maroochy Surf Club']:
  point=Polygon(coords(way)).centroid;data['pois'].append({'name':t['name'],'x':round(point.x,1),'z':round(point.y,1),'coastal':True})
# Offshore points offset east of the mapped shoreline: a connected coastal run.
route=[]
for z in range(-1950,-4401,-150):
 crossing=coast.intersection(LineString([[w['minX'],z],[w['maxX'],z]]))
 if crossing.geom_type=='Point':route.append([round(crossing.x+200,1),z])
for aa,bb in zip(route,route[1:]):assert not land.buffer(10).intersects(LineString([aa,bb])),'Coastal route must stay in water'
def destination(key,name,index):
 x,z=route[index];nxt=route[index+1];return{'id':key,'name':name,'x':x,'z':z,'heading':round(math.atan2(nxt[0]-x,nxt[1]-z),5)}
places=[destination('mooloolaba','Mooloolaba Beach',1),destination('alexandra','Alexandra Headland',6),destination('maroochydore','Maroochydore Beach',13)]
data['coastalExtension']={'date':'2026-10-19','baseCommit':'7b5a163','previousNorth':old_north,'sourceURL':'https://www.openstreetmap.org/api/0.6/map?bbox=153.099,-26.6775,153.142,-26.653','sourceSHA256':sha256(raw).hexdigest(),'shoreline':[rounded(q.coords)for q in parts(coast,'LineString')],'destinations':places,'route':route,'added':added,'terrain':'Authored approximate elevations; mapped plan layout, not survey geometry'}
data['source']['extract_sha256']['alexandra-north-2026-10-19']=sha256(raw).hexdigest()
# Retain the existing estuary exposure field exactly below the old north edge.
# New northern samples derive exposure from the mapped shoreline; GPU and CPU
# both read this one new field. A denser grid retains similar canal resolution.
old=json.loads(a.base.read_text());ow=old['world'];old_field=old['waveField'];on=old_field['size'];vals=old_field['values']
def sample_old(x,z):
 u=max(0,min(on-1,(x-ow['minX'])/(ow['maxX']-ow['minX'])*(on-1)));v=max(0,min(on-1,(z-ow['minZ'])/(ow['maxZ']-ow['minZ'])*(on-1)));i=int(u);j=int(v);fx=u-i;fz=v-j
 at=lambda xx,zz:vals[min(on-1,zz)*on+min(on-1,xx)]
 return round((at(i,j)*(1-fx)+at(i+1,j)*fx)*(1-fz)+(at(i,j+1)*(1-fx)+at(i+1,j+1)*fx)*fz)
size=256;field=[]
for j in range(size):
 z=w['minZ']+(w['maxZ']-w['minZ'])*j/(size-1)
 for i in range(size):
  x=w['minX']+(w['maxX']-w['minX'])*i/(size-1)
  if z>=old_north:field.append(sample_old(x,z));continue
  point=Point(x,z);clearance=new_land.distance(point);mix=max(0,min(1,(clearance-15)/150));mix=mix*mix*(3-2*mix);field.append(round((.22+.26*max(0,min(1,clearance/100))+.52*mix)*255))
data['waveField']={'size':size,'values':field};a.output.write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Extended world:',w,'new features:',added,'destinations:',places)
