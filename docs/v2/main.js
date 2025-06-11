const container = document.getElementById('container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

camera.position.set(0, 20, 30);
controls.target.set(0,0,0);

// board setup
const board = new THREE.Group();
const squareSize = 2;
for(let x=0; x<8; x++){
  for(let z=0; z<8; z++){
    const color = (x+z)%2===0?0xeeeeee:0x444444;
    const geo = new THREE.BoxGeometry(squareSize, 0.1, squareSize);
    const mat = new THREE.MeshPhongMaterial({color});
    const square = new THREE.Mesh(geo, mat);
    square.position.set((x-3.5)*squareSize, 0, (z-3.5)*squareSize);
    square.userData = {x,z};
    board.add(square);
  }
}
scene.add(board);

// lights
const ambient = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(10,20,10);
scene.add(dir);

// piece geometries
const pieceGeo = {
  p: new THREE.CylinderGeometry(0.5,0.5,1.5,32),
  r: new THREE.CylinderGeometry(0.6,0.6,1,32),
  n: new THREE.ConeGeometry(0.5,1.5,32),
  b: new THREE.ConeGeometry(0.4,1.8,32),
  q: new THREE.CylinderGeometry(0.5,0.5,2,32),
  k: new THREE.CylinderGeometry(0.5,0.5,2,32)
};

const whiteMat = new THREE.MeshPhongMaterial({color:0xffffff});
const blackMat = new THREE.MeshPhongMaterial({color:0x222222});

const chess = new Chess();
const pieces = {}; // map square -> mesh

function createPieceMesh(type, color){
  const geo = pieceGeo[type];
  const mat = color==='w'?whiteMat:blackMat;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function squareToPosition(sq){
  const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(sq[1]) - 1;
  return [(file-3.5)*squareSize, 0.55, (rank-3.5)*squareSize];
}

function refreshPieces(){
  // remove old
  Object.values(pieces).forEach(m=>scene.remove(m));
  for(const key in pieces) delete pieces[key];
  // place new
  chess.SQUARES.forEach(sq=>{
    const piece = chess.get(sq);
    if(piece){
      const mesh = createPieceMesh(piece.type, piece.color);
      const [x,y,z] = squareToPosition(sq);
      mesh.position.set(x,y,z);
      scene.add(mesh);
      pieces[sq] = mesh;
    }
  });
}
refreshPieces();

let selected = null;

function onClick(event){
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, camera);
  const intersects = ray.intersectObjects(board.children);
  if(intersects.length>0){
    const {x,z} = intersects[0].object.userData;
    const file = String.fromCharCode('a'.charCodeAt(0)+x);
    const rank = (z+1).toString();
    const sq = file+rank;
    if(selected){
      const move = chess.move({from:selected,to:sq,promotion:'q'});
      if(move){
        refreshPieces();
      }
      selected=null;
    }else{
      const piece = chess.get(sq);
      if(piece){
        selected=sq;
      }
    }
  }
}
renderer.domElement.addEventListener('click', onClick);

// camera movement
const keys = {};
window.addEventListener('keydown',e=>{keys[e.code]=true;});
window.addEventListener('keyup',e=>{keys[e.code]=false;});

function updateCamera(dt){
  const speed = 10*dt;
  if(keys['ArrowUp']||keys['KeyW']) camera.position.z -= speed;
  if(keys['ArrowDown']||keys['KeyS']) camera.position.z += speed;
  if(keys['ArrowLeft']||keys['KeyA']) camera.position.x -= speed;
  if(keys['ArrowRight']||keys['KeyD']) camera.position.x += speed;
  if(keys['Space']) camera.position.y += speed;
  if(keys['ShiftLeft']||keys['ShiftRight']) camera.position.y -= speed;
}

let last = performance.now();
function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now-last)/1000;
  last = now;
  updateCamera(dt);
  controls.update();
  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
