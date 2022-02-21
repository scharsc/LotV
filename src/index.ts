import * as THREE from "three";
import * as Lotv from "@faro-lotv/lotv";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore We need to use a magic webpack url because webpack highjack import.meta.url
Lotv.setWorkersUrl(__webpack_base_uri__);

// Our dataset is oriented with Z-UP so we need to configure threejs properly
THREE.Object3D.DefaultUp.set(0, 0, 1);
// The project we want to render
const project = "dischingen-church";

// Recover a reference to our canvas
const c = document.getElementById("canvas") as HTMLCanvasElement;
// Init viewer
const viewer = new Lotv.Viewer(c);
const scene = viewer.scene;
const camera = viewer.camera as THREE.PerspectiveCamera;
const renderer = viewer.renderer;
// Connect to webshare instance
const webshare = new Lotv.WebshareInstance("https://faro.websharecloud.com");
// Add 3d navigation
const controls = new Lotv.OrbitControls(camera, renderer.domElement);

let sz = renderer.getSize(new THREE.Vector2());
// Prepare EffectComposer FBO

// Start render loop
viewer.draw();

// Enumerate point cloud, each webshare project can have more than one
const pointClouds = await webshare.getPointClouds(project);
// Select only pointclouds that are ready and pick first
const pcDesc = pointClouds.filter((pc) => pc.EntityUUIDs.length > 0 && pc.Type === "EntityPC" && pc.State === "complete")[0];
// Load the selected point cloud tree
const tree = await webshare.getKDTree(project, pcDesc.UUID, pcDesc.EntityUUIDs[0]);
// Init the material to render points
const material = new THREE.PointsMaterial({ vertexColors: true, size: 0.05 });
// Store in memory the last 10000 nodes so we don't re-fetch them
const cacheStrategy = new Lotv.CleanupNodesComputerNumberOfChunks(10000);
// Create the renderable point cloud
const lodCloud = new Lotv.LodPointCloud(tree, material, { cacheCleanComputer: cacheStrategy });
// Add it to the scene
scene.add(lodCloud);

// making the camera look at the model's bounding box
const treePos = new THREE.Vector3();
treePos.setFromMatrixPosition(tree.worldMatrix);
const bbox = tree.getNode(0).boundingBox;
const diagonal = bbox.max.distanceTo(bbox.min);
camera.position.set(treePos.x + diagonal / 4, treePos.y, treePos.z);
camera.lookAt(treePos);
camera.far = diagonal * 4;
camera.near = camera.far * 0.0001;
camera.updateMatrixWorld(true);
camera.updateProjectionMatrix();
controls.target = treePos;

// Before each render update tree visible nodes
viewer.onBeforeRender.on(() => {
	const sz = renderer.getSize(new THREE.Vector2());
	lodCloud.updateVisibleNodes(camera, sz.multiplyScalar(renderer.getPixelRatio()));
	controls.update();
});

