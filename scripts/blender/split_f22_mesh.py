"""
Blender (bpy) pipeline script to convert the CC-BY 4.0 NLM F-22 Raptor GLB
into a clean, Draco-compressed, multi-part glTF binary aligned to the
F-22 Raptor Interactive Explorer coordinate frame and part IDs.

Source model:
  "F22 Raptor FREE" by NLM (https://sketchfab.com/NLM-Group)
  URL: https://sketchfab.com/3d-models/f22-raptor-free-2a64abf0866a405c865466c7642ca689
  License: CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/)

Usage:
  blender --background --python scripts/blender/split_f22_mesh.py -- \
    --input /path/to/f22_raptor_free.glb \
    --output public/models/f22-raptor-nlm.glb

Coordinate convention (matching Three.js & src/scene/f22Geometry.ts):
  - Length scaled to exact 18.92 m (USAF F-22 Fact Sheet)
  - Nose at -Z (-9.46 m), tail at +Z (+9.46 m)
  - Ground plane at Y = 0 (tires resting on Y = 0)
  - Right wing +X, left wing -X
"""

import argparse
import os
import sys
import bpy
import bmesh
import mathutils

TARGET_LENGTH_M = 18.92

# Drop list (boarding ladder & non-airframe props)
DROP_OBJECTS = {"Object_89"}

# Direct object-name -> explorer partId mapping (before X/Y bisection splits)
DIRECT_MAP = {
    # Radome & forward fuselage
    "Object_161": "radome",
    "Object_163": "forward-fuselage",
    "Object_157": "forward-fuselage",
    "Object_103": "forward-fuselage",
    "Object_105": "forward-fuselage",
    "Object_113": "forward-fuselage",
    # Canopy & cockpit
    "Object_41": "canopy",
    "Object_43": "canopy",
    "Object_91": "cockpit-tub",
    # Tail booms & aft shroud
    "Object_119": "tail-booms",
    "Object_109": "tail-booms",
    "Object_115": "tail-booms",
    "Object_107": "aft-fuselage",
    "Object_117": "aft-fuselage",
    "Object_123": "aft-fuselage",
    # Control surfaces (already separate in source GLB!)
    "Object_70": "rudder-left",
    "Object_73": "rudder-right",
    "Object_151": "stabilator-left",
    "Object_121": "stabilator-right",
    "Object_82": "flaperon-left",
    "Object_76": "flaperon-right",
    "Object_85": "aileron-left",
    "Object_79": "aileron-right",
    # 2D Thrust-vectoring nozzles
    "Object_45": "nozzle-2d-left",
    "Object_87": "nozzle-2d-right",
    # Nose landing gear & doors
    "Object_5": "nose-landing-gear",
    "Object_7": "nose-landing-gear",
    "Object_9": "nose-landing-gear",
    "Object_11": "nose-landing-gear",
    "Object_13": "nose-landing-gear",
    "Object_15": "nose-landing-gear",
    "Object_17": "nose-landing-gear",
    "Object_19": "nose-landing-gear",
    "Object_21": "nose-landing-gear",
    "Object_23": "nose-landing-gear",
    "Object_24": "nose-landing-gear",
    "Object_26": "nose-landing-gear",
    "Object_28": "nose-landing-gear",
    "Object_31": "nose-landing-gear",
    "Object_33": "nose-landing-gear",
    "Object_35": "nose-landing-gear",
    "Object_38": "nose-landing-gear",
    "Object_171": "nose-gear-doors",
    "Object_173": "nose-gear-doors",
    "Object_175": "nose-gear-doors",
    "Object_97": "nose-gear-doors",
    # Main landing gear & doors
    "Object_59": "main-landing-gear-left",
    "Object_61": "main-landing-gear-left",
    "Object_63": "main-landing-gear-left",
    "Object_65": "main-landing-gear-left",
    "Object_67": "main-landing-gear-left",
    "Object_47": "main-landing-gear-right",
    "Object_49": "main-landing-gear-right",
    "Object_51": "main-landing-gear-right",
    "Object_55": "main-landing-gear-right",
    "Object_57": "main-landing-gear-right",
    "Object_125": "main-gear-doors",
    "Object_127": "main-gear-doors",
    "Object_129": "main-gear-doors",
    "Object_131": "main-gear-doors",
    "Object_133": "main-gear-doors",
    # Weapons bays & doors
    "Object_135": "main-weapons-bay",
    "Object_137": "main-weapons-bay",
    "Object_165": "main-bay-doors",
    "Object_169": "main-bay-doors",
    "Object_155": "side-bay-doors",
    "Object_167": "side-bay-doors",
    "Object_145": "side-weapons-bay-left",
    "Object_147": "side-weapons-bay-left",
    "Object_148": "side-weapons-bay-left",
    "Object_149": "side-weapons-bay-left",
    "Object_139": "side-weapons-bay-right",
    "Object_141": "side-weapons-bay-right",
    "Object_142": "side-weapons-bay-right",
    "Object_143": "side-weapons-bay-right",
}

# Symmetric objects split at X = 0 into (left_id, right_id)
SPLIT_X0_MAP = {
    "Object_111": ("vertical-stabilizer-left", "vertical-stabilizer-right"),
    "Object_95": ("intake-caret-left", "intake-caret-right"),
    "Object_153": ("intake-caret-left", "intake-caret-right"),
    "Object_53": ("main-landing-gear-left", "main-landing-gear-right"),
    "Object_101": ("wing-left", "wing-right"),
}

# Tire meshes with ~10k polys each -> decimate cleanly for fast mobile WebGL
DECIMATE_HEAVY = {"Object_9": 0.22, "Object_49": 0.22, "Object_61": 0.22, "Object_19": 0.35, "Object_51": 0.35, "Object_63": 0.35}


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(argv)


def bake_world_transforms(objs):
    """Apply all parent transforms directly into mesh vertices and unparent."""
    for obj in objs:
        mat = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = mathutils.Matrix.Identity(4)
        obj.data.transform(mat)
        obj.data.update()


def split_mesh_by_predicate(obj, name_a, name_b, pred_fn):
    """Split polygons of a mesh object into two new objects based on face center predicate."""
    bm_src = bmesh.new()
    bm_src.from_mesh(obj.data)
    bm_src.faces.ensure_lookup_table()

    out_objs = []
    for target_name, keep_val in ((name_a, True), (name_b, False)):
        bm = bm_src.copy()
        to_del = [f for f in bm.faces if bool(pred_fn(f.calc_center_median())) != keep_val]
        if to_del:
            bmesh.ops.delete(bm, geom=to_del, context="FACES")
        if len(bm.faces) > 0:
            mesh = bpy.data.meshes.new(target_name)
            bm.to_mesh(mesh)
            new_obj = bpy.data.objects.new(target_name, mesh)
            bpy.context.collection.objects.link(new_obj)
            out_objs.append((target_name, new_obj))
        bm.free()

    bm_src.free()
    bpy.data.objects.remove(obj, do_unlink=True)
    return out_objs


def create_pbr_materials():
    """Create clean, trademark-free PBR materials for the F-22."""
    specs = {
        "mat_ram_skin": ((0.20, 0.23, 0.27, 1.0), 0.18, 0.52, 1.0),
        "mat_ram_dark": ((0.12, 0.14, 0.17, 1.0), 0.22, 0.56, 1.0),
        "mat_canopy_gold": ((0.76, 0.56, 0.18, 1.0), 0.72, 0.10, 0.55),
        "mat_nozzle_metal": ((0.16, 0.18, 0.21, 1.0), 0.85, 0.34, 1.0),
        "mat_gear_strut": ((0.64, 0.68, 0.73, 1.0), 0.78, 0.28, 1.0),
        "mat_bay_white": ((0.74, 0.78, 0.82, 1.0), 0.12, 0.58, 1.0),
        "mat_cockpit_dark": ((0.08, 0.10, 0.12, 1.0), 0.25, 0.68, 1.0),
    }
    mats = {}
    for name, (rgba, metal, rough, alpha) in specs.items():
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Metallic"].default_value = metal
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Alpha"].default_value = alpha
        if alpha < 1.0:
            mat.blend_method = "BLEND" if hasattr(mat, "blend_method") else "HASHED"
        mats[name] = mat
    return mats


def material_for_part(part_id, mats):
    if part_id == "canopy":
        return mats["mat_canopy_gold"]
    if "nozzle" in part_id:
        return mats["mat_nozzle_metal"]
    if "gear" in part_id and "doors" not in part_id:
        return mats["mat_gear_strut"]
    if "bay" in part_id and "doors" not in part_id:
        return mats["mat_bay_white"]
    if part_id == "cockpit-tub":
        return mats["mat_cockpit_dark"]
    if part_id in ("radome", "intake-caret-left", "intake-caret-right", "tail-booms"):
        return mats["mat_ram_dark"]
    return mats["mat_ram_skin"]


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=args.input)
    bpy.context.view_layer.update()

    # 1. Remove non-airframe objects (boarding ladder) & unused cameras/lights
    for obj in list(bpy.data.objects):
        if obj.name in DROP_OBJECTS or obj.type in ("CAMERA", "LIGHT"):
            bpy.data.objects.remove(obj, do_unlink=True)

    # 2. Bake world transforms on all mesh objects
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bake_world_transforms(meshes)

    # Remove leftover empties
    for obj in list(bpy.data.objects):
        if obj.type == "EMPTY":
            bpy.data.objects.remove(obj, do_unlink=True)

    # 3. Decimate heavy 10k-poly tire/hub meshes cleanly
    for name, ratio in DECIMATE_HEAVY.items():
        obj = bpy.data.objects.get(name)
        if obj:
            mod = obj.modifiers.new(name="Decimate", type="DECIMATE")
            mod.ratio = ratio
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=mod.name)

    # 4. Compute airframe bounds in Blender space (X=span, Y=nose(-)->tail(+), Z=up)
    all_meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    xs, ys, zs = [], [], []
    for o in all_meshes:
        for c in o.bound_box:
            v = o.matrix_world @ mathutils.Vector(c)
            xs.append(v.x)
            ys.append(v.y)
            zs.append(v.z)

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    min_z, max_z = min(zs), max(zs)
    raw_len = max_y - min_y
    scale = TARGET_LENGTH_M / raw_len
    cx = (min_x + max_x) * 0.5
    cy = (min_y + max_y) * 0.5

    # Normalize all meshes: centered X=0, Y(length) centered [-9.46, +9.46], ground Z=0
    # Note: glTF exporter automatically converts Blender (+X right, +Y back, +Z up)
    # to glTF (+X right, +Y up, -Z forward -> nose at -Z, tail at +Z)!
    # Wait: in Blender glTF export (export_yup=True), Blender (X, Y, Z) -> glTF (X, Z, -Y).
    # Since source nose is at -Y and tail is at +Y, flipping Y -> -Y makes nose at +Y in Blender
    # which exports to glTF -Z (nose forward) and tail to +Z!
    mat_norm = (
        mathutils.Matrix.Scale(scale, 4)
        @ mathutils.Matrix.Diagonal((1.0, -1.0, 1.0, 1.0))
        @ mathutils.Matrix.Translation((-cx, -cy, -min_z))
    )
    # Apply translation + uniform scale + 180 deg Z rotation so handedness stays right-handed!
    # Rotating 180 deg around Z sends (x, y, z) -> (-x, -y, z), so nose (-y) -> +y (glTF -z)!
    mat_norm = (
        mathutils.Matrix.Scale(scale, 4)
        @ mathutils.Matrix.Rotation(3.141592653589793, 4, "Z")
        @ mathutils.Matrix.Translation((-cx, -cy, -min_z))
    )
    for o in all_meshes:
        o.data.transform(mat_norm)
        o.data.update()

    # After 180 deg Z rotation:
    # Blender +Y = nose (+9.46 m) -> glTF -Z (-9.46 m)
    # Blender -Y = tail (-9.46 m) -> glTF +Z (+9.46 m)
    # Blender +X = left (-X in glTF? Wait: glTF X = Blender X, so after 180° Z rot, old -X is now +X!)
    # Let's group by target part_id using the post-rotation coordinates!
    buckets = {}

    def add_to_bucket(part_id, obj):
        buckets.setdefault(part_id, []).append(obj)

    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            continue
        name = obj.name
        if name in DIRECT_MAP:
            pid = DIRECT_MAP[name]
            # Swap left/right suffix because 180° Z rotation mirrored X
            if pid.endswith("-left"):
                pid = pid[:-5] + "-right"
            elif pid.endswith("-right"):
                pid = pid[:-6] + "-left"
            add_to_bucket(pid, obj)
        elif name in SPLIT_X0_MAP:
            left_id, right_id = SPLIT_X0_MAP[name]
            for pid, sub in split_mesh_by_predicate(obj, left_id, right_id, lambda c: c.x < 0.0):
                add_to_bucket(pid, sub)
        elif name in ("Object_93", "Object_159", "Object_99"):
            # Main wing + fuselage hull: split wings (|x| > 1.85 m) from center/aft fuselage
            for pid, sub in split_mesh_by_predicate(obj, "wings", "hull", lambda c: abs(c.x) > 1.85):
                if pid == "wings":
                    for wpid, wsub in split_mesh_by_predicate(sub, "wing-left", "wing-right", lambda c: c.x < 0.0):
                        add_to_bucket(wpid, wsub)
                else:
                    # Center fuselage (y > -2.5 m in Blender -> forward of FS 12 m) vs aft fuselage
                    for hpid, hsub in split_mesh_by_predicate(sub, "center-fuselage", "aft-fuselage", lambda c: c.y > -2.5):
                        add_to_bucket(hpid, hsub)
        else:
            add_to_bucket("center-fuselage", obj)

    # 5. Join each bucket into a single named mesh object with clean PBR material
    mats = create_pbr_materials()
    # Strip all old heavy textures/materials
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)

    final_count = 0
    total_tris = 0
    for part_id, objs in sorted(buckets.items()):
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        joined.name = part_id
        joined.data.name = f"{part_id}_mesh"
        joined.data.materials.clear()
        joined.data.materials.append(material_for_part(part_id, mats))
        # Smooth shading with sharp edges preserved via normal calculation
        for poly in joined.data.polygons:
            poly.use_smooth = True
        final_count += 1
        total_tris += sum(len(p.vertices) - 2 for p in joined.data.polygons)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=args.output,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_materials="EXPORT",
    )
    size_kb = os.path.getsize(args.output) / 1024.0
    print(f"EXPORTED {args.output}: {final_count} parts, {total_tris} tris, {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
