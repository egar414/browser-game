import bpy,json,struct,base64,math,hashlib,os,sys
from pathlib import Path
from mathutils import Vector
source=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else os.environ['TENDER_STL_SOURCE']
out=str(Path(__file__).resolve().parents[1]/'src/assets/tender225-mesh.json')
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.wm.stl_import(filepath=source);obj=bpy.context.object
# Keep the uploaded shell and built-in fittings, fitting its seating and keel
# to the existing crew and waterline rather than changing propulsion physics.
for v in obj.data.vertices:
 x,y,z=v.co;v.co=(x*(1.22/50.999672),z*(.05 if z<0 else .033)+.24,y*.0225)
# Swap from STL Z-up to the game's Y-up reverses handedness.
import bmesh
bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free();obj.data.update()
original=obj.data.copy()
def encode(mesh):
 mesh.calc_loop_triangles()
 # Preserve genuine crease edges using split loop normals, quantise and index.
 for p in mesh.polygons:p.use_smooth=True
 mesh.set_sharp_from_angle(angle=math.radians(38))
 vertices=[];normals=[];indices=[];lookup={}
 ns=mesh.corner_normals
 for tri in mesh.loop_triangles:
  for loop in tri.loops:
   vi=mesh.loops[loop].vertex_index;p=mesh.vertices[vi].co;n=ns[loop].vector
   qp=tuple(round(c*20000) for c in p);qn=tuple(round(c*127) for c in n);key=qp+qn
   if key not in lookup:lookup[key]=len(vertices)//3;vertices.extend(qp);normals.extend(qn)
   indices.append(lookup[key])
 return {'positions':base64.b64encode(struct.pack('<'+'h'*len(vertices),*vertices)).decode(),'normals':base64.b64encode(struct.pack('<'+'b'*len(normals),*normals)).decode(),'indices':base64.b64encode(struct.pack('<'+'H'*len(indices),*indices)).decode(),'triangles':len(indices)//3,'vertices':len(vertices)//3}
result={'source':'single_color_261030100313_WUGV.stl','sourceSha256':hashlib.sha256(open(source,'rb').read()).hexdigest(),'sourceTriangles':500000,'positionScale':1/20000}
for key,target in [('player',20000),('moored',5500)]:
 obj.data=original.copy();dec=obj.modifiers.new('Browser triangle budget','DECIMATE');dec.ratio=target/500000;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=dec.name);result[key]=encode(obj.data);print(key,result[key]['triangles'],result[key]['vertices'])
# Separate mask profile is fitted from the original shell's underside using
# vertical ray casts. Benches cannot be hit before the outer keel from below.
obj.data=original;obj.data.update();bpy.context.view_layer.update()
profiles=[]
for i in range(33):
 z=-1.08+i/32*2.205
 # Rim height follows the stem upsweep; horizontal casts exclude tall handles.
 rim=.35+max(0,(z-.4)/.725)*.18
 ok,p,n,face=obj.ray_cast(Vector((-2,rim,z)),Vector((1,0,0)));left=p.x if ok else -.01
 ok,p,n,face=obj.ray_cast(Vector((2,rim,z)),Vector((-1,0,0)));right=p.x if ok else .01
 width=max(.005,min(.60,(abs(left)+abs(right))*.5))
 ring=[]
 for f in [-1,-.76,-.38,0,.38,.76,1]:
  x=f*width;ok,p,n,face=obj.ray_cast(Vector((x,-2,z)),Vector((0,1,0)))
  y=p.y if ok else rim
  if abs(f)==1:y=rim
  ring.append([x,y,z])
 ring.append([0,rim,z]);profiles.append(ring)
result['profile']=profiles
os.makedirs(os.path.dirname(out),exist_ok=True);open(out,'w').write(json.dumps(result,separators=(',',':')))
print('saved',out,os.path.getsize(out))
