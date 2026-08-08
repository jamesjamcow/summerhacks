"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type ArenaGameProps = { projectileImageUrl?: string };
const PLAYER_HEIGHT = 1.65;
const PLAYER_RADIUS = 0.36;
const MOVE_SPEED = 6.2;

function makeCardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff1bc"; context.fillRect(0, 0, 512, 512);
  context.strokeStyle = "#ef5d4d"; context.lineWidth = 26; context.strokeRect(18, 18, 476, 476);
  context.fillStyle = "#27234e"; context.textAlign = "center";
  context.font = "900 168px Georgia"; context.fillText("♥", 256, 280);
  context.font = "700 43px Arial"; context.fillText("MEMORY", 256, 405);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function ArenaGame({ projectileImageUrl }: ArenaGameProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [throws, setThrows] = useState(12);
  const [hitFlash, setHitFlash] = useState(false);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#86c8d4"); scene.fog = new THREE.Fog("#86c8d4", 18, 48);
    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 90); camera.position.set(0, PLAYER_HEIGHT, 9);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight("#d9fbff", "#70554a", 2.2));
    const sun = new THREE.DirectionalLight("#fff0d2", 3.2); sun.position.set(-8, 14, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({ color: "#6e7567", roughness: 0.96 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const colliders: THREE.Box3[] = [];
    const addBlock = (x:number,y:number,z:number,w:number,h:number,d:number,color:string) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ color, roughness:.82, flatShading:true }));
      mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; scene.add(mesh); colliders.push(new THREE.Box3().setFromObject(mesh));
    };
    addBlock(0,2,-15,32,4,1.4,"#54585b"); addBlock(-16,2,0,1.4,4,31,"#5b5f61"); addBlock(16,2,0,1.4,4,31,"#5b5f61"); addBlock(0,2,15,32,4,1.4,"#54585b");
    addBlock(-6.5,1.5,2,6,3,3,"#a75842"); addBlock(7,1.25,-3,5,2.5,5,"#455e65"); addBlock(0,.55,-7,7,1.1,3,"#8f7964"); addBlock(2,1.2,6,2.5,2.4,7,"#a36c4b"); addBlock(-10,2.2,-8,3.5,4.4,3.5,"#536974");
    for(let i=0;i<5;i+=1) addBlock(-4+i*1.75,.22+i*.32,-10,1.9,.45+i*.65,3.4,"#77736c");
    const targets: THREE.Mesh[]=[];
    [[-8,1.2,-3],[10,1.2,7],[4,1.2,-11],[-11,1.2,8]].forEach(([x,y,z])=>{ const target=new THREE.Mesh(new THREE.IcosahedronGeometry(.72,1),new THREE.MeshStandardMaterial({color:"#ff5a54",emissive:"#5d0909",flatShading:true})); target.position.set(x,y,z); target.castShadow=true; scene.add(target); targets.push(target); });
    let projectileTexture: THREE.Texture=makeCardTexture();
    if(projectileImageUrl) new THREE.TextureLoader().load(projectileImageUrl,(loaded)=>{ loaded.colorSpace=THREE.SRGBColorSpace; projectileTexture.dispose(); projectileTexture=loaded; });
    const keys=new Set<string>(); const projectiles:{mesh:THREE.Mesh;velocity:THREE.Vector3;life:number}[]=[]; const clock=new THREE.Clock(); let yaw=0; let pitch=0; let ammo=12;
    const resize=()=>{ const {clientWidth,clientHeight}=mount; renderer.setSize(clientWidth,clientHeight,false); camera.aspect=clientWidth/Math.max(clientHeight,1); camera.updateProjectionMatrix(); }; resize();
    const onKeyDown=(event:KeyboardEvent)=>keys.add(event.code); const onKeyUp=(event:KeyboardEvent)=>keys.delete(event.code);
    const onPointerLock=()=>setLocked(document.pointerLockElement===renderer.domElement);
    const onMouseMove=(event:MouseEvent)=>{ if(document.pointerLockElement!==renderer.domElement)return; yaw-=event.movementX*.0022; pitch=THREE.MathUtils.clamp(pitch-event.movementY*.002,-1.35,1.35); };
    const shoot=(event:MouseEvent)=>{ if(document.pointerLockElement!==renderer.domElement){renderer.domElement.requestPointerLock();return;} if(event.button!==0)return; if(ammo<=0){ammo=12;setThrows(ammo);return;} ammo-=1;setThrows(ammo);
      const card=new THREE.Mesh(new THREE.PlaneGeometry(.72,.72),new THREE.MeshBasicMaterial({map:projectileTexture,side:THREE.DoubleSide,transparent:true})); card.position.copy(camera.position); const direction=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize(); card.position.addScaledVector(direction,.65);scene.add(card);projectiles.push({mesh:card,velocity:direction.multiplyScalar(18),life:2.5}); };
    window.addEventListener("keydown",onKeyDown);window.addEventListener("keyup",onKeyUp);document.addEventListener("pointerlockchange",onPointerLock);document.addEventListener("mousemove",onMouseMove);renderer.domElement.addEventListener("mousedown",shoot);const observer=new ResizeObserver(resize);observer.observe(mount);
    let frame=0; const animate=()=>{ frame=requestAnimationFrame(animate);const delta=Math.min(clock.getDelta(),.05);camera.rotation.set(pitch,yaw,0,"YXZ");
      const input=new THREE.Vector3(Number(keys.has("KeyD"))-Number(keys.has("KeyA")),0,Number(keys.has("KeyS"))-Number(keys.has("KeyW")));
      if(input.lengthSq()){input.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(MOVE_SPEED*delta);(["x","z"] as const).forEach((axis)=>{const next=camera.position.clone();next[axis]+=input[axis];const player=new THREE.Box3(new THREE.Vector3(next.x-PLAYER_RADIUS,.1,next.z-PLAYER_RADIUS),new THREE.Vector3(next.x+PLAYER_RADIUS,PLAYER_HEIGHT+.2,next.z+PLAYER_RADIUS));if(!colliders.some(box=>box.intersectsBox(player)))camera.position[axis]=next[axis];});}
      targets.forEach((target,index)=>{target.rotation.y+=delta*(.7+index*.08);target.position.y=1.2+Math.sin(clock.elapsedTime*1.7+index)*.16;});
      for(let i=projectiles.length-1;i>=0;i-=1){const projectile=projectiles[i];projectile.life-=delta;projectile.mesh.position.addScaledVector(projectile.velocity,delta);projectile.mesh.rotation.z+=delta*8;projectile.mesh.lookAt(camera.position);const hit=targets.find(target=>target.visible&&target.position.distanceTo(projectile.mesh.position)<1.05);if(hit){hit.visible=false;window.setTimeout(()=>{hit.visible=true;},2200);setScore(current=>current+100);setHitFlash(true);window.setTimeout(()=>setHitFlash(false),120);projectile.life=0;}if(projectile.life<=0){scene.remove(projectile.mesh);projectile.mesh.geometry.dispose();(projectile.mesh.material as THREE.Material).dispose();projectiles.splice(i,1);}}
      renderer.render(scene,camera);};animate();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("keydown",onKeyDown);window.removeEventListener("keyup",onKeyUp);document.removeEventListener("pointerlockchange",onPointerLock);document.removeEventListener("mousemove",onMouseMove);renderer.domElement.removeEventListener("mousedown",shoot);if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();projectileTexture.dispose();renderer.dispose();renderer.domElement.remove();};
  },[projectileImageUrl]);

  return <div className={hitFlash?"arena-game is-hit":"arena-game"} ref={mountRef}>
    <div className="arena-score"><small>SCORE</small><strong>{score.toString().padStart(4,"0")}</strong></div><div className="arena-team-score"><b>12</b><span>VS</span><b>8</b></div>
    <div className="arena-feed"><span>You remembered the red target</span><span>A memory flew across the map</span></div><div className="arena-crosshair" aria-hidden="true"><i/><i/></div>
    <div className="arena-hand" aria-hidden="true"><div className="arena-held-image" style={projectileImageUrl?{backgroundImage:`url(${projectileImageUrl})`}:undefined}>♥</div></div>
    <div className="arena-ammo"><small>MEMORIES</small><strong>{throws}<span>/12</span></strong></div><div className="arena-controls"><span>W A S D</span> move <span>CLICK</span> throw <span>ESC</span> cursor</div>
    {!locked?<button className="arena-start" onClick={()=>mountRef.current?.querySelector("canvas")?.requestPointerLock()} type="button"><strong>ENTER THE MEMORY ARENA</strong><span>Click to capture your cursor</span></button>:null}
  </div>;
}
