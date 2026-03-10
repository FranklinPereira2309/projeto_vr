import { NodeIO } from '@gltf-transform/core';

async function checkGLB() {
    const io = new NodeIO();
    try {
        const doc = await io.read('public/models/franklin_animado.glb');
        const root = doc.getRoot();

        console.log("=== GLB Info ===");
        console.log("Extensions:", root.listExtensionsUsed().map(e => e.extensionName));
        console.log("Animations:", root.listAnimations().map(a => a.getName() || '<unnamed>'));
        console.log("Materials:", root.listMaterials().map(m => m.getName() || '<unnamed>'));

        let hasMorphTargets = false;
        root.listMeshes().forEach(mesh => {
            mesh.listPrimitives().forEach(prim => {
                if (prim.listTargets().length > 0) hasMorphTargets = true;
            });
        });
        console.log("Has Morph Targets:", hasMorphTargets);
    } catch (error) {
        console.error("Error reading GLB:", error);
    }
}

checkGLB();
