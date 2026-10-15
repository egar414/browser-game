"""Original Spark-inspired PWC shell. Run: blender -b -t 2 -P art/build_sparkplug.py
No manufacturer meshes, logos or photographic textures are used.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,hex,rough=.4,metal=.04,coat=0):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*[linear(int(hex[i:i+2],16)/255) for i in (0,2,4)],1)
 p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Coat Weight'].default_value=coat
 return m
black=material('Hull graphite','152128',.39,.04,.3);hood=material('Sculpted charcoal','232b32',.32,.04,.5)
accent=material('Accent blue','1679e8',.29,.05,.65);seat=material('Accent saddle','1679e8',.65)
rubber=material('Footwell rubber','10181d',.9);silver=material('Brushed alloy','aab7bb',.28,.75)
meshes=[]
def finish(obj,name,mat,bevel=.015,smooth=True):
 obj.name=name;obj.data.materials.append(mat)
 if bevel:
  mod=obj.modifiers.new('Moulded edge fillets','BEVEL');mod.width=bevel;mod.segments=3
 if smooth:
  for p in obj.data.polygons:p.use_smooth=True
 mod=obj.modifiers.new('Weighted panel normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 meshes.append(obj);return obj
def mesh(name,vertices,faces,mat,bevel=.015,smooth=True):
 data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in vertices],[],faces);data.update()
 obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);return finish(obj,name,mat,bevel,smooth)
def loft(name,sections,mat,bevel=.015):
 vs=[];faces=[]
 for z,w,top,bottom in sections:
  vs.extend([(0,top+.025,z),(w*.72,top,z),(w,top-.065,z),(w*.98,top-.18,z),(w*.66,bottom+.07,z),(0,bottom,z),(-w*.66,bottom+.07,z),(-w*.98,top-.18,z),(-w,top-.065,z),(-w*.72,top,z)])
 n=10
 for j in range(len(sections)-1):
  for k in range(n):a=j*n+k;b=j*n+(k+1)%n;faces.append((a,a+n,b+n,b))
 faces.append(tuple(range(n-1,-1,-1)));a=(len(sections)-1)*n;faces.append(tuple(a+i for i in range(n)))
 # Recalculate consistently outward after building the closed shell.
 obj=mesh(name,vs,faces,mat,bevel)
 bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)
 return obj
def block(name,size,pos,mat,bevel=.02,rx=0,ry=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(pos[0],-pos[2],pos[1]));obj=bpy.context.object;obj.dimensions=(size[0],size[2],size[1]);obj.rotation_euler=(rx,0,ry);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(obj,name,mat,bevel)
def rail(name,points,radius,mat):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=6;curve.bevel_depth=radius;curve.bevel_resolution=2
 sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for p,co in zip(sp.bezier_points,points):p.co=(co[0],-co[2],co[1]);p.handle_left_type=p.handle_right_type='AUTO'
 obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj=bpy.context.object;obj.select_set(False);return finish(obj,name,mat,0)
loft('Compact V hull',[(-1.46,.43,.17,-.16),(-1.24,.55,.24,-.26),(-.65,.60,.28,-.30),(.02,.58,.33,-.28),(.62,.52,.37,-.2),(1.04,.37,.34,-.13),(1.32,.20,.26,-.015),(1.48,.015,.15,.07)],black,.018)
loft('Coloured upper body',[(-1.17,.32,.31,.18),(-.8,.36,.38,.22),(-.15,.39,.43,.27),(.40,.47,.52,.31),(.83,.40,.47,.27),(1.18,.23,.34,.20),(1.42,.018,.20,.14)],accent,.018)
loft('Angular black nose hood',[(.05,.20,.57,.36),(.36,.32,.75,.42),(.64,.36,.72,.41),(.95,.27,.58,.33),(1.21,.15,.38,.23),(1.40,.018,.235,.15)],hood,.015)
loft('Raised saddle pedestal',[(-1.10,.16,.39,.22),(-.85,.23,.57,.26),(-.35,.21,.59,.29),(.04,.17,.58,.31),(.24,.12,.49,.34)],rubber,.025)
loft('Contoured narrow saddle',[(-1.01,.13,.58,.49),(-.84,.215,.70,.54),(-.53,.22,.725,.57),(-.14,.185,.71,.55),(.13,.13,.61,.49)],seat,.035)
loft('Steering console',[(.06,.15,.62,.48),(.30,.16,.71,.44),(.47,.115,.66,.42)],hood,.015)
block('Instrument lens',(.15,.018,.1),(0,.733,.27),rubber,.012)
rail('Handlebar riser outer',[(0,.58,.52),(0,.88,.44),(0,1.24,.35)],.042,silver)
rail('Riser clamp sleeve',[(0,.60,.51),(0,.95,.41)],.061,hood)
for s in [-1,1]:
 block('Deep footwell mat',(.22,.045,1.23),(s*.445,.265,-.44),rubber,.025)
 for j in range(13):block('Footwell grip ridge',(.195,.009,.015),(s*.445,.293,-1.0+j*.089),hood,.004)
 rail('Perimeter rub rail',[(s*.45,.18,-1.4),(s*.59,.24,-.9),(s*.61,.29,-.24),(s*.54,.35,.51),(s*.35,.30,1.08),(s*.10,.2,1.42)],.026,rubber)
 rail('Seat surround rail',[(s*.31,.35,-1.06),(s*.33,.43,-.48),(s*.32,.46,.02)],.025,black)
 block('Raised rear step wedge',(.205,.17,.32),(s*.435,.33,-1.075),rubber,.026,rx=.15)
 block('Side vent inset',(.028,.11,.28),(s*.35,.48,.22),rubber,.008)
 for j in range(4):block('Vent slat',(.012,.016,.095),(s*.37,.45+j*.024,.23),silver,.002)
 rail('Foredeck panel seam',[(s*.28,.61,.23),(s*.35,.66,.59),(s*.25,.52,.94)],.007,rubber)
 rail('Accent eyebrow',[(s*.40,.49,.22),(s*.45,.48,.58),(s*.32,.42,.99)],.012,accent)
 block('Rear bumper',(.16,.09,.21),(s*.43,.215,-1.34),black,.03)
block('Rear boarding deck',(.69,.035,.26),(0,.19,-1.28),rubber,.022)
rail('Rear grab handle',[(-.16,.28,-1.13),(0,.34,-1.25),(.16,.28,-1.13)],.023,black)
# Apply fillets and merge the static shell, retaining material slots. Dynamic
# rider, bars and pump components remain articulated in the browser code.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 for mod in list(o.modifiers):
  try:bpy.ops.object.modifier_apply(modifier=mod.name)
  except RuntimeError:pass
 o.select_set(False)
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();shell=bpy.context.object;shell.name='Sparkplug shell'
# One packed UV atlas and a small original ambient-occlusion bake add depth in
# the footwells and panel joins even on the phone profile without shadows.
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.018);bpy.ops.object.mode_set(mode='OBJECT')
image=bpy.data.images.new('Original baked shell occlusion',width=256,height=256,alpha=False)
for m in shell.data.materials:
 node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;m.node_tree.nodes.active=node
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.bake.margin=3
bpy.ops.object.bake(type='AO');image.pack()
for m in shell.data.materials:
 group=bpy.data.node_groups.get('glTF Material Output')
 if group is None:
  group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
 output=m.node_tree.nodes.new('ShaderNodeGroup');output.node_tree=group
 tex=next(n for n in m.node_tree.nodes if n.type=='TEX_IMAGE');m.node_tree.links.new(tex.outputs['Color'],output.inputs['Occlusion'])
(ROOT/'src/assets').mkdir(exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/sparkplug.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'src/assets/sparkplug.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
print('Exported original Blender shell',len(shell.data.polygons),'polygons')
