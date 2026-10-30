import bpy,json,struct,base64,math,hashlib,os,sys
from pathlib import Path
from mathutils import Vector
source=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else os.environ['SEAGO_STL_SOURCE']
out=Path(__file__).resolve().parents[1]/'src/assets/seago-mesh.json'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.wm.stl_import(filepath=source);obj=bpy.context.object
source_count=len(obj.data.polygons)
def smooth(x):
 x=max(0,min(1,x));return x*x*(3-2*x)
for v in obj.data.vertices:
 along,across,up=v.co
 taper=smooth((along-20)/30)
 forward=along*.0365+.18*taper
 forward=-1.825+(forward+1.825)*3.65/3.83
 v.co=(across*(1.32/35.80177)*(1-.72*taper),up*(.0422 if up<0 else .0375)+.28,forward)
obj.data.update();full=obj.data.copy()
mod=obj.modifiers.new('Browser mesh budget','DECIMATE');mod.ratio=20000/source_count;bpy.ops.object.modifier_apply(modifier=mod.name)
m=obj.data
for p in m.polygons:p.use_smooth=True
m.set_sharp_from_angle(angle=math.radians(38));m.calc_loop_triangles()
vertices=[];normals=[];indices=[];lookup={};corners=m.corner_normals
for tri in m.loop_triangles:
 for li in tri.loops:
  p=m.vertices[m.loops[li].vertex_index].co;n=corners[li].vector
  qp=tuple(round(c*10000) for c in p);qn=tuple(round(c*127) for c in n);key=qp+qn
  if key not in lookup:lookup[key]=len(vertices)//3;vertices.extend(qp);normals.extend(qn)
  indices.append(lookup[key])
def pack(fmt,items):return base64.b64encode(struct.pack('<'+fmt*len(items),*items)).decode()
result={'source':Path(source).name,'sourceSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),'sourceTriangles':source_count,'positionScale':.0001,'triangles':len(indices)//3,'vertices':len(vertices)//3,'bowTaper':.72,'positions':pack('h',vertices),'normals':pack('b',normals),'indices':pack('H',indices)}
# Sample the transformed source hull, so visual clipping follows the new bow.
obj.data=full;bpy.context.view_layer.update();profiles=[]
for i in range(33):
 z=-1.82+i/32*3.64;rim=.22+max(0,(z-.9)/.92)*.08
 ok,p,n,face=obj.ray_cast(Vector((-2,rim,z)),Vector((1,0,0)));left=abs(p.x) if ok else .008
 ok,p,n,face=obj.ray_cast(Vector((2,rim,z)),Vector((-1,0,0)));right=abs(p.x) if ok else .008
 width=max(.008,min(.66,(left+right)*.5));ring=[]
 for f in[-1,-.76,-.38,0,.38,.76,1]:
  x=f*width;ok,p,n,face=obj.ray_cast(Vector((x,-2,z)),Vector((0,1,0)));y=p.y if ok else rim
  if abs(f)==1:y=rim
  ring.append([x,y,z])
 ring.append([0,rim,z]);profiles.append(ring)
result['profile']=profiles;out.write_text(json.dumps(result,separators=(',',':')))
print('Saved',out,len(indices)//3,len(vertices)//3,out.stat().st_size)
