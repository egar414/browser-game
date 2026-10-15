"""Build the shipped ODbL geometry database from OSM XML extracts.
Tooling only: pip install shapely; see src/data/README.md for sources/licence.
Usage: PYTHONPATH=/tmp/estuary-geo-tools python scripts/build-mooloolaba-map.py --source-dir /tmp
"""
import argparse, json, math, xml.etree.ElementTree as ET
from pathlib import Path
from hashlib import sha256
from shapely.geometry import Polygon, LineString, Point, box
from shapely.ops import unary_union, polygonize
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--output',type=Path,default=Path('src/data/mooloolaba.json'));args=parser.parse_args()
files=['mooloolaba-osm-map','mooloolaba-map-south','mooloolaba-map-north','mooloolaba-river-full']
nodes={};ways={};rels={}
for name in files:
 root=ET.parse(args.source_dir/name).getroot()
 nodes.update({e.get('id'):e for e in root.findall('node')});ways.update({e.get('id'):e for e in root.findall('way')});rels.update({e.get('id'):e for e in root.findall('relation')})
def tags(e):return {t.get('k'):t.get('v') for t in e.findall('tag')}
def xy(lon,lat):return ((float(lon)-153.124)*111320*math.cos(math.radians(26.694)),-(float(lat)+26.694)*111320)
def coords(e):return [xy(nodes[n.get('ref')].get('lon'),nodes[n.get('ref')].get('lat')) for n in e.findall('nd')]
def rounded(points):return [[round(x,1),round(z,1)] for x,z in points]
def geometry_parts(g,kind):return [g] if g.geom_type==kind else [p for p in getattr(g,'geoms',[]) if p.geom_type==kind]
world_box=box(*xy(153.108,-26.677),*xy(153.142,-26.711));xmin,zmin,xmax,zmax=world_box.bounds
outer=[];inner=[]
for m in rels['1380756'].findall('member'):
 if m.get('type')=='way':(inner if m.get('role')=='inner' else outer).append(LineString(coords(ways[m.get('ref')])) )
river_outer=unary_union(list(polygonize(unary_union(outer))))
islands=unary_union(list(polygonize(unary_union(inner))))
river=river_outer.difference(islands).intersection(world_box)
coasts=[LineString(coords(w)).intersection(world_box) for w in ways.values() if tags(w).get('natural')=='coastline']
regions=list(polygonize(unary_union([world_box.boundary,*coasts])))
ocean=unary_union([p for p in regions if p.covers(Point(*xy(153.141,-26.681)))])
water=max(geometry_parts(unary_union([river,ocean]),'Polygon'),key=lambda p:p.area)
land=world_box.difference(water).simplify(1.2,preserve_topology=True)
land_parts=geometry_parts(land,'Polygon')
land_data=[]
for i,p in enumerate(land_parts):
 c=p.representative_point();name='Estuary bank';city=c.x<700 and c.y<-800
 if p.area<180000 and c.y<-650:name='Minyama Island'
 elif p.area<180000 and c.y<300:name='Mooloolah Island'
 elif c.x>600:name='Buddina / Point Cartwright'
 elif c.y>200:name='Mooloolah River mangrove bank'
 else:name='Mooloolaba / Minyama bank'
 land_data.append({'name':name,'points':rounded(p.exterior.coords),'holes':[rounded(r.coords) for r in p.interiors], 'bounds':[round(n,1) for n in p.bounds],'city':city,'grass':[{'points':rounded(q.exterior.coords),'holes':[rounded(r.coords) for r in q.interiors]} for q in geometry_parts(p.buffer(-4).simplify(1.5,preserve_topology=True),'Polygon')]})
# A short, clear island loop. Select its actual OSM island geometry, not a fictional rectangle.
island=min([p for p in geometry_parts(islands,'Polygon') if world_box.covers(p.centroid)],key=lambda p:p.centroid.distance(Point(-50,-830)))
course=None
for offset in [38,34,30,26,22,18]:
 candidate=island.buffer(offset,quad_segs=6).exterior
 if water.buffer(-3).covers(candidate):course=candidate;break
if course is None:raise RuntimeError('No clear island race loop')
# Locate the start near the Wharf and follow its north side eastward.
start=course.project(Point(-350,-1030));d=course.length
p0=course.interpolate(start);p1=course.interpolate((start+20)%d)
sign=1 if p1.x>p0.x else -1
n=math.ceil(d/82);race=[course.interpolate((start+sign*(i+1)*d/n)%d) for i in range(n)]
# Segment straight lines remain entirely in navigable water.
for a,b in zip([p0,*race[:-1]],race):
 if not water.buffer(-2).covers(LineString([a,b])):raise RuntimeError('Race chord crosses shore; increase sampling density')
p1=race[0];spawn={'x':-220,'z':-1080,'heading':math.atan2(p1.x+220,p1.y+1080)} # clear water beside The Wharf
features={'buildings':[],'roads':[],'piers':[],'bridges':[],'channels':[],'parks':[],'beaches':[],'pois':[],'residential':[],'breakwaters':[]}
for ident,w in ways.items():
 t=tags(w);points=coords(w)
 if len(points)<2:continue
 line=LineString(points)
 if not world_box.intersects(line):continue
 if t.get('building') and t.get('building')!='no' and len(points)>=4 and points[0]==points[-1]:
  p=Polygon(points).buffer(0)
  if p.is_empty or p.area<18 or not world_box.covers(p):continue
  try:h=float((t.get('height') or '').split()[0])
  except (ValueError,IndexError):
   try:h=float(t.get('building:levels','1'))*3.1
   except ValueError:h=4.5
  features['buildings'].append({'id':ident,'points':rounded(points),'h':round(max(3.5,min(h,52)),1),'name':t.get('name',''),'kind':t.get('building','yes'),'roofShape':t.get('roof:shape',''),'heightSource':'mapped height' if t.get('height') else 'mapped levels' if t.get('building:levels') else 'estimate'})
 if t.get('highway') in ['residential','tertiary','secondary','primary','trunk','unclassified','service'] and not t.get('bridge'):
  for seg in geometry_parts(line.intersection(world_box),'LineString'):
   features['roads'].append({'points':rounded(seg.simplify(2).coords),'name':t.get('name',''),'kind':t.get('highway',''),'w':9 if t.get('highway') in ['primary','trunk','secondary'] else 5})
 if t.get('landuse')=='residential' and len(points)>3 and points[0]==points[-1]:
  for p in geometry_parts(Polygon(points).buffer(0).intersection(world_box),'Polygon'):
   features['residential'].append({'points':rounded(p.exterior.coords)})
 if t.get('man_made')=='breakwater':
  for p in geometry_parts(line.intersection(world_box),'LineString'):
   features['breakwaters'].append({'points':rounded(p.coords),'name':t.get('name','Breakwater')})
 if t.get('man_made')=='pier':
  for seg in geometry_parts(line.intersection(world_box),'LineString'):
   if seg.length>5:features['piers'].append({'id':ident,'points':rounded(seg.simplify(.6).coords),'area':points[0]==points[-1]})
 if t.get('bridge')=='yes' and t.get('highway') in ['residential','secondary','primary','tertiary','trunk']:
  for seg in geometry_parts(line.intersection(world_box),'LineString'):
   if seg.length>15 and seg.intersects(water):features['bridges'].append({'name':t.get('name','Road bridge'),'points':rounded(seg.simplify(2).coords),'w':7})
 if t.get('waterway') in ['canal','river','stream']:
  for seg in geometry_parts(line.intersection(world_box),'LineString'):
   if seg.length>20 and seg.intersection(water).length>seg.length*.8:features['channels'].append({'name':t.get('name','Canal'),'points':rounded(seg.simplify(4).coords)})
 if t.get('natural')=='beach' and len(points)>3:features['beaches'].append({'points':rounded(points)})
 if t.get('leisure')=='park' and len(points)>3:features['parks'].append({'name':t.get('name','Coastal park'),'points':rounded(points)})
 if t.get('man_made')=='lighthouse':
  p=line.centroid;features['pois'].append({'name':t.get('name','Lighthouse'),'x':round(p.x,1),'z':round(p.y,1),'lighthouse':True})
 if t.get('name') in ['The Wharf Mooloolaba','Mooloolaba Marina','Point Cartwright Reserve','Mooloolaba Spit Park']:
  p=line.centroid;features['pois'].append({'name':t['name'],'x':round(p.x,1),'z':round(p.y,1)})
for n in nodes.values():
 t=tags(n)
 if t.get('man_made')=='lighthouse' or 'lighthouse' in t.get('name','').lower():
  x,z=xy(n.get('lon'),n.get('lat'))
  if world_box.covers(Point(x,z)):features['pois'].append({'name':t.get('name','Lighthouse'),'x':round(x,1),'z':round(z,1),'lighthouse':True})
# Identical width-sensitive wave field for CPU buoyancy and the GPU surface.
size=128;field=[]
for iz in range(size):
 for ix in range(size):
  p=Point(xmin+(xmax-xmin)*ix/(size-1),zmin+(zmax-zmin)*iz/(size-1))
  clearance=land.distance(p)
  sea_distance=ocean.boundary.distance(p)*(1 if ocean.covers(p) else -1)
  mix=max(0,min(1,(sea_distance+25)/175));mix=mix*mix*(3-2*mix)
  chop=.22+.26*max(0,min(1,clearance/100))+.52*mix
  field.append(round(min(1,chop)*255))
ramps=[{'x':1500,'z':-1050,'width':13,'length':17,'height':3.4},{'x':1600,'z':-940,'width':12,'length':20,'height':4.6}]
for ramp in ramps:
 if water.boundary.distance(Point(ramp['x'],ramp['z']))<20 or not water.covers(Point(ramp['x'],ramp['z'])):raise RuntimeError('Unsafe stunt placement')
data={'source':{'name':'OpenStreetMap contributors','license':'ODbL 1.0','url':'https://www.openstreetmap.org/copyright','date':'2026-10-15','projection':{'longitude':153.124,'latitude':-26.694,'units':'metres, east +X / south +Z'},'extract_sha256':{name:sha256((args.source_dir/name).read_bytes()).hexdigest() for name in files}},'world':{'minX':round(xmin,1),'maxX':round(xmax,1),'minZ':round(zmin,1),'maxZ':round(zmax,1)},'land':land_data,'spawn':spawn,'race':rounded([(p.x,p.y) for p in race]),'ramps':ramps,'stunt':{'x':1550,'z':-1000,'radius':190},'waveField':{'size':size,'values':field},**features}
args.output.write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Wrote',args.output,args.output.stat().st_size,'bytes;', {k:len(v) for k,v in features.items()},'race gates',len(race),'spawn',spawn)
