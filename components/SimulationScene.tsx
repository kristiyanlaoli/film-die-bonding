'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { CameraPreset, Parameters, Results, Stage, ViewMode, STAGES, clamp, lerp, smooth } from '@/lib/simulation';
import { getSceneLayout } from '@/lib/sceneLayout';

type SceneProps = {
  params: Parameters;
  results: Results;
  stage: Stage;
  progress: number;
  viewMode: ViewMode;
  cameraPreset: CameraPreset;
  showLabels: boolean;
  sceneLabels?: { leftAssembly: string; leftCross: string; rightAssembly: string; rightCross: string };
};

const COPPER = '#bc8054';
const FILM = '#e6ad50';
const SILICON = '#26384d';
const PAD_HEIGHT = 0.33;
const DIE_THICK = 0.37;

function FilmMaterial({ cured = false, transparent = false }: { cured?: boolean; transparent?: boolean }) {
  return <meshPhysicalMaterial color={cured ? '#c88445' : FILM} roughness={cured ? 0.4 : 0.19} metalness={0.06} transparent opacity={transparent ? 0.47 : 0.89} clearcoat={cured ? .2 : .9} clearcoatRoughness={0.12} />;
}

function SiliconDie({ width, depth, fade = false, thickness = DIE_THICK }: { width: number; depth: number; fade?: boolean; thickness?: number }) {
  const pads = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const x = -width * 0.41 + i * (width * .82 / 6);
      pos.push([x, thickness / 2 + 0.008, -depth * .40]);
      pos.push([x, thickness / 2 + 0.008, depth * .40]);
    }
    for (let i = 1; i < 6; i++) {
      const z = -depth * .40 + i * (depth * .8 / 6);
      pos.push([-width * .41, thickness / 2 + .008, z]);
      pos.push([width * .41, thickness / 2 + .008, z]);
    }
    return pos;
  }, [width, depth, thickness]);
  return <group>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width, thickness, depth]} />
      <meshPhysicalMaterial color={SILICON} metalness={.46} roughness={.24} transparent={fade} opacity={fade ? .24 : 1} />
    </mesh>
    <mesh position={[0, thickness / 2 + .007, 0]}>
      <boxGeometry args={[width * .78, .011, depth * .76]} />
      <meshStandardMaterial color="#315776" metalness={.75} roughness={.30} transparent={fade} opacity={fade ? .19 : 1} />
    </mesh>
    {pads.map((pos, i) => <mesh key={i} position={pos}>
      <boxGeometry args={[Math.max(.045, width * .048), .019, Math.max(.045, depth * .048)]} />
      <meshStandardMaterial color="#f0c781" metalness={.85} roughness={.20} transparent={fade} opacity={fade ? .4 : 1} />
    </mesh>)}
    <mesh position={[0, -thickness / 2 - .003, 0]}>
      <boxGeometry args={[width * .98, .009, depth * .98]} />
      <meshStandardMaterial color="#b3c4d4" metalness={.7} roughness={.36} transparent={fade} opacity={fade ? .25 : 1} />
    </mesh>
  </group>;
}

const dieThickness = (p:Parameters)=>.18 + p.waferThickness*.0016;
const filmHeight = (um:number)=>.065+um*.0045;
const TAPE_Y = .01;
function FilmDie({p,film,fade=false,cured=false}:{p:Parameters;film:number;fade?:boolean;cured?:boolean}){
 const h=dieThickness(p);
 return <group><SiliconDie width={p.dieWidth} depth={p.dieHeight} thickness={h} fade={fade}/>
 <mesh position={[0,-h/2-film/2-.008,0]} castShadow><boxGeometry args={[p.dieWidth,film,p.dieHeight]}/><FilmMaterial cured={cured} transparent={fade}/></mesh></group>;
}
function TapeRing({p}:{p:Parameters}){
 const l=getSceneLayout(p);
 return <group>
 <mesh position={[0,TAPE_Y,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[l.tapeRadius,64]}/><meshPhysicalMaterial color="#3c8a95" transparent opacity={.35} side={2} roughness={.3} depthWrite={false}/></mesh>
 <mesh position={[0,-.04,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[l.tapeRadius+.14,.18,12,64]}/><meshStandardMaterial color="#a4b4c4" metalness={.83} roughness={.26}/></mesh>
 <mesh position={[0,-.86,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[l.tapeRadius-.3,l.baseRadius,64]}/><meshStandardMaterial color="#27374a" side={2}/></mesh>
 </group>;
}
function TapeStage({p,eject}:{p:Parameters;eject:number}){
 const l=getSceneLayout(p), h=dieThickness(p), f=filmHeight(p.filmThickness), y=TAPE_Y+f+h/2+.008;
 return <group position={[l.waferX,0,0]}><TapeRing p={p}/>
 {[-1,0,1].flatMap(ix=>[-1,0,1].map(iz=>ix===0&&iz===0?null:<group key={`${ix}-${iz}`} position={[ix*(p.dieWidth+.42),y,iz*(p.dieHeight+.42)]}><FilmDie p={p} film={f}/></group>))}
 <mesh position={[0,-.72+eject,0]}><boxGeometry args={[p.dieWidth*.65,.12,p.dieHeight*.65]}/><meshStandardMaterial color="#738da1" metalness={.7}/></mesh>
 {[-1,1].flatMap(x=>[-1,1].map(z=><mesh key={`${x}-${z}`} position={[x*p.dieWidth*.19,-.35+eject,z*p.dieHeight*.19]}><cylinderGeometry args={[.085,.085,.72,16]}/><meshStandardMaterial color="#d4dde7" metalness={.8}/></mesh>))}
 <mesh position={[-p.dieWidth*.45,-.72+eject,0]}><boxGeometry args={[p.dieWidth*.9,.15,.36]}/><meshStandardMaterial color="#667989" metalness={.7}/></mesh>
 <mesh position={[-p.dieWidth*.85,-.82,0]}><cylinderGeometry args={[.32,.32,.3,24]}/><meshStandardMaterial color="#334658"/></mesh>
 {[-1,1].flatMap(x=>[-1,1].map(z=><group key={`${x}-${z}`} position={[x*(p.dieWidth/2+.10),.04,z*(p.dieHeight/2+.10)]}><mesh><boxGeometry args={[.17,.012,.025]}/><meshBasicMaterial color="#79f0f4"/></mesh><mesh><boxGeometry args={[.025,.012,.17]}/><meshBasicMaterial color="#79f0f4"/></mesh></group>))}
 </group>;
}
// A nine-die wafer coupon is used to make the process visible at a useful scale.
function Preparation({p,stage,progress}:{p:Parameters;stage:Stage;progress:number}){
 const l=getSceneLayout(p), w=p.dieWidth*3, d=p.dieHeight*3, h=dieThickness(p), f=filmHeight(p.filmThickness);
 const thin=stage==='thin', lam=stage==='laminate', dice=stage==='dice';
 const hh=thin?lerp(.85,h,smooth(progress)):h;
 const filmY=TAPE_Y+f/2, siliconY=TAPE_Y+f+hh/2+.008;
 const sep=dice?.42*smooth((progress-.72)/.28):0;
 const lamProgress=lam?smooth((progress-.12)/.75):1;
 const cut=Math.min(3,Math.floor(progress/.18));
 const cutT=clamp((progress-cut*.18)/.18,0,1);
 return <group position={[l.waferX,0,0]}>
 <TapeRing p={p}/>
 {dice&&progress>=.72?[-1,0,1].flatMap(x=>[-1,0,1].map(z=><group key={`${x}-${z}`} position={[x*(p.dieWidth+sep),siliconY,z*(p.dieHeight+sep)]}><FilmDie p={p} film={f}/></group>)):<>
 <mesh position={[0,siliconY,0]} castShadow><boxGeometry args={[w,hh,d]}/><meshStandardMaterial color={SILICON} metalness={.5} roughness={.3}/></mesh>
 {[-1,0,1].flatMap(x=>[-1,0,1].map(z=><mesh key={`${x}-${z}`} position={[x*p.dieWidth,thin?siliconY-hh/2-.008:siliconY+hh/2+.008,z*p.dieHeight]}><boxGeometry args={[p.dieWidth*.91,.02,p.dieHeight*.91]}/><meshStandardMaterial color="#315776" metalness={.65}/></mesh>))}
 {thin?<mesh position={[0,TAPE_Y+f/2,0]}><boxGeometry args={[w,.08,d]}/><meshStandardMaterial color="#6f9ba8"/></mesh>:<mesh position={[-w/2+w*lamProgress/2,filmY,0]}><boxGeometry args={[Math.max(.001,w*lamProgress),f,d]}/><FilmMaterial/></mesh>}
 </>}
 {thin&&<group position={[lerp(-w*.25,w*.25,smooth(progress)),siliconY+hh/2+lerp(.6,.15,smooth(progress/.2)),0]} rotation={[0,progress*24,0]}><mesh><cylinderGeometry args={[Math.min(w,d)*.31,Math.min(w,d)*.31,.3,48]}/><meshStandardMaterial color="#b9bfc8" metalness={.8}/></mesh><mesh position={[0,.6,0]}><cylinderGeometry args={[.32,.32,1,24]}/><meshStandardMaterial color="#8899a9"/></mesh></group>}
 {lam&&<group position={[-w/2+w*lamProgress,siliconY+hh/2+.38,0]} rotation={[Math.PI/2,0,0]}><mesh><cylinderGeometry args={[.38,.38,d+.35,32]}/><meshStandardMaterial color="#c3a876" metalness={.6}/></mesh></group>}
 {dice&&progress<.72&&<>
 {Array.from({length:4},(_,i)=>{const amount=clamp((progress-i*.18)/.18,0,1);if(amount<=0)return null;const alongZ=i<2;const offset=(i%2===0?-1:1)*(alongZ?p.dieWidth:p.dieHeight)/2;return <mesh key={i} position={[alongZ?offset:-w/2+w*amount/2,siliconY+hh/2+.025,alongZ?-d/2+d*amount/2:offset]}><boxGeometry args={[alongZ?.035:w*amount,.012,alongZ?d*amount:.035]}/><meshBasicMaterial color="#0c1725"/></mesh>})}
 <group position={[cut<2?(cut===0?-1:1)*p.dieWidth/2:lerp(-w/2,w/2,cutT),siliconY+hh/2+.42,cut<2?lerp(-d/2,d/2,cutT):(cut===2?-1:1)*p.dieHeight/2]} rotation={[cut<2?0:Math.PI/2,0,cut<2?Math.PI/2:0]}><mesh><cylinderGeometry args={[.52,.52,.065,40]}/><meshStandardMaterial color="#bccad6" metalness={.84}/></mesh></group>
 </>}
 </group>;
}

function Substrate({ p }: { p: Parameters }) {
  const lead = p.substrate === 'leadframe';
  const layout = getSceneLayout(p);
  return <group position={[layout.substrateX, 0, 0]}>
    <mesh position={[0, -.065, 0]} castShadow receiveShadow>
      <boxGeometry args={[layout.substrateWidth, .62, layout.substrateDepth]} />
      <meshStandardMaterial color={lead ? '#45566a' : '#235b55'} metalness={lead ? .72 : .17} roughness={.38} />
    </mesh>
    {lead ? <>
      <mesh position={[0, .279, 0]} receiveShadow>
        <boxGeometry args={[p.dieWidth + 1, .11, p.dieHeight + 1]} />
        <meshStandardMaterial color="#bd895a" metalness={.89} roughness={.22} />
      </mesh>
      {[-1, 1].flatMap(side => [-2, -1, 0, 1, 2].map(j => <mesh key={`lead-${side}-${j}`} position={[side * (p.dieWidth / 2 + 1.22), .255, j * .61]}>
        <boxGeometry args={[.65, .08, .33]} />
        <meshStandardMaterial color="#d1a178" metalness={.84} roughness={.24} />
      </mesh>))}
    </> : <>
      <mesh position={[0, .278, 0]}>
        <boxGeometry args={[p.dieWidth + 1, .11, p.dieHeight + 1]} />
        <meshStandardMaterial color="#a87d53" metalness={.72} roughness={.29} />
      </mesh>
      {Array.from({ length: 10 }, (_, k) => <mesh key={k} position={[-layout.substrateWidth * .44 + k * layout.substrateWidth * .088, .255, -layout.substrateDepth * .43]}>
        <boxGeometry args={[.23, .02, .8]} />
        <meshStandardMaterial color="#d0a260" metalness={.81} roughness={.27} />
      </mesh>)}
    </>}
    {[-1, 1].flatMap(ix => [-1, 1].map(iz => <group key={`fid-${ix}-${iz}`} position={[ix * (p.dieWidth / 2 + .28), .342, iz * (p.dieHeight / 2 + .28)]}>
      <mesh><boxGeometry args={[.17, .012, .025]} /><meshBasicMaterial color="#7cedee" /></mesh>
      <mesh><boxGeometry args={[.025, .012, .17]} /><meshBasicMaterial color="#7cedee" /></mesh>
    </group>))}
    <mesh position={[0, -.41, 0]} receiveShadow>
      <boxGeometry args={[layout.substrateWidth + .8, .09, layout.substrateDepth + .7]} />
      <meshStandardMaterial color="#142336" metalness={.4} roughness={.57} />
    </mesh>
  </group>;
}

function Collet({ x, y, z }: { x: number; y: number; z: number }) {
  return <group position={[x, y + .58, z]}>
    <mesh castShadow position={[0, .4, 0]}>
      <cylinderGeometry args={[.48, .62, .76, 24]} />
      <meshStandardMaterial color="#9cb5cb" metalness={.82} roughness={.26} />
    </mesh>
    <mesh castShadow position={[0, .92, 0]}>
      <cylinderGeometry args={[.26, .26, .42, 24]} />
      <meshStandardMaterial color="#d3e4ed" metalness={.76} roughness={.20} />
    </mesh>
    <mesh position={[0, -.06, 0]}>
      <cylinderGeometry args={[.53, .31, .27, 24]} />
      <meshStandardMaterial color="#536d80" metalness={.75} roughness={.27} />
    </mesh>
    <mesh position={[0, -.21, 0]}>
      <cylinderGeometry args={[.26, .26, .025, 24]} />
      <meshStandardMaterial color="#293442" metalness={.28} roughness={.59} />
    </mesh>
    <mesh position={[0, .8, 0]}>
      <boxGeometry args={[.57, .08, .57]} />
      <meshStandardMaterial color="#00d7e7" emissive="#057a93" emissiveIntensity={.48} />
    </mesh>
  </group>;
}

function AlignmentOverlay({ p, progress }: { p: Parameters; progress: number }) {
  const glow = .3 + Math.sin(progress * 10) * .20;
  return <group position={[getSceneLayout(p).substrateX, 1.05, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[Math.max(p.dieWidth, p.dieHeight) * .62, Math.max(p.dieWidth, p.dieHeight) * .63, 64]} />
      <meshBasicMaterial color="#64f3f5" side={2} transparent opacity={.75 + glow * .2} />
    </mesh>
    <mesh><boxGeometry args={[p.dieWidth + .8, .009, .018]} /><meshBasicMaterial color="#4cf1f0" transparent opacity={.62} /></mesh>
    <mesh><boxGeometry args={[.018, .009, p.dieHeight + .8]} /><meshBasicMaterial color="#4cf1f0" transparent opacity={.62} /></mesh>
    {[-1, 1].flatMap(x => [-1, 1].map(z => <mesh key={`${x}-${z}`} position={[x * p.dieWidth * .51, 0, z * p.dieHeight * .51]}>
      <sphereGeometry args={[.075, 10, 8]} />
      <meshBasicMaterial color="#64f3f5" />
    </mesh>))}
  </group>;
}

function CureChamber({ progress, p }: { progress: number; p: Parameters }) {
  const glow = smooth(progress);
  return <group position={[getSceneLayout(p).substrateX, 1.5, 0]}>
    <mesh position={[0, .40, 0]}>
      <boxGeometry args={[getSceneLayout(p).substrateWidth + .7, 3.75, getSceneLayout(p).substrateDepth + .8]} />
      <meshPhysicalMaterial color={'#ed9747'} transparent opacity={.055 + glow * .040} roughness={.1} side={2} depthWrite={false} />
    </mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * (getSceneLayout(p).substrateWidth / 2 - .2), 2.2, 0]}>
      <boxGeometry args={[.06, .09, getSceneLayout(p).substrateDepth - .3]} />
      <meshBasicMaterial color={'#f9a35d'} transparent opacity={.55 + glow * .4} />
    </mesh>)}
    <pointLight intensity={1.1 * glow} color={'#ff8b3c'} position={[0, 1.7, 0]} distance={10} />
  </group>;
}

function Ground() {
  return <group>
    <mesh position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#0b1522" roughness={.89} metalness={.07} />
    </mesh>
    {Array.from({ length: 33 }, (_, i) => <group key={i}>
      <mesh position={[-16 + i, -.994, 0]}>
        <boxGeometry args={[.012, .002, 21]} />
        <meshBasicMaterial color="#233c50" transparent opacity={.25} />
      </mesh>
      <mesh position={[0, -.993, -10 + i * .625]}>
        <boxGeometry args={[33, .002, .012]} />
        <meshBasicMaterial color="#233c50" transparent opacity={.23} />
      </mesh>
    </group>)}
  </group>;
}

function Assembly({ p, r, stage, progress, viewMode }: {p:Parameters;r:Results;stage:Stage;progress:number;viewMode:ViewMode}){
 const l=getSceneLayout(p), h=dieThickness(p), raw=filmHeight(p.filmThickness), final=filmHeight(r.blt);
 const prep=stage==='thin'||stage==='laminate'||stage==='dice';
 if(prep)return <group><Ground/><Preparation p={p} stage={stage} progress={progress}/></group>;
 const pickup=stage==='pickup', aligning=stage==='align', placing=stage==='place';
 const bonded=stage==='cure'||stage==='inspect';
 const contact=Math.max(.28,.64-p.dwell*.035);
 const press=placing?smooth((progress-contact)/Math.max(.1,.88-contact)):bonded?1:0;
 const film=lerp(raw,final,press);
 const startY=TAPE_Y+raw+h/2+.008;
 const flightY=3.6+h/2;
 // Pins raise die from tape, collet reaches its top, then both lift; pins retract before transfer.
 const rise=pickup?.34*smooth((progress-.06)/.28):0;
 const eject=pickup?rise*(1-smooth((progress-.48)/.24)):0;
 const pickY=lerp(startY+rise,flightY,smooth((progress-.34)/.57));
 const x=pickup?l.waferX:aligning?lerp(l.waferX,l.substrateX+p.offsetX/1000,smooth(progress)):l.substrateX+p.offsetX/1000;
 const z=pickup?0:aligning?lerp(0,p.offsetY/1000,smooth(progress)):p.offsetY/1000;
 const y=pickup?pickY:aligning?flightY:placing?lerp(flightY,PAD_HEIGHT+raw+h/2+.008,smooth(progress/contact))-(raw-film):PAD_HEIGHT+film+h/2+.008;
 const colletY=pickup&&progress<.34?lerp(flightY+1.3,startY+.34,smooth(progress/.34)):y+(placing?1.8*smooth((progress-.88)/.12):0);
 const cured=stage==='inspect'||stage==='cure'&&progress>.75;
 return <group><Ground/><Substrate p={p}/><TapeStage p={p} eject={eject}/>
 <group position={[x,y,z]} rotation={[0,0,bonded||press>.95?r.tilt*Math.PI/180*2:0]}><FilmDie p={p} film={film} fade={viewMode==='transparent'} cured={cured}/></group>
 {(pickup||aligning||placing&&progress<.99)&&<Collet x={x} y={colletY+h/2-.3575} z={z}/>}
 {placing&&<pointLight position={[l.substrateX,PAD_HEIGHT+.55,0]} color="#ff9b4d" intensity={clamp((p.bondTemp-25)/80,0,2)} distance={Math.max(p.dieWidth,p.dieHeight)*1.8}/> }
 {aligning&&<AlignmentOverlay p={p} progress={progress}/>}
 {stage==='cure'&&<CureChamber p={p} progress={progress}/>}
 {(bonded||press>.9)&&r.voids>4.5&&viewMode==='transparent'&&Array.from({length:Math.min(9,Math.ceil(r.voids/2))},(_,i)=><mesh key={i} position={[x+Math.sin(i*7)*p.dieWidth*.35,PAD_HEIGHT+.025,z+Math.cos(i*5)*p.dieHeight*.35]}><sphereGeometry args={[.13,12,8]}/><meshBasicMaterial color="#172536"/></mesh>)}
 </group>;
}
function CrossSection({p,r}:{p:Parameters;r:Results}){
 const w=p.dieWidth*1.4, h=dieThickness(p), f=filmHeight(r.blt)*1.5;
 return <group><Ground/>
 <mesh position={[0,-.31,0]}><boxGeometry args={[w+3,.7,1.75]}/><meshStandardMaterial color={p.substrate==='leadframe'?COPPER:'#257567'} roughness={.32} metalness={.62}/></mesh>
 <mesh position={[p.offsetX/1000,.04+f/2,0]}><boxGeometry args={[w,f,1.72]}/><FilmMaterial cured/></mesh>
 {r.voids>4.5&&Array.from({length:Math.min(8,Math.ceil(r.voids/2))},(_,i)=><mesh key={i} position={[Math.sin(i*4+1)*w*.4,.04+f*.5,.868]}><sphereGeometry args={[Math.min(f*.4,.08+r.voids/180),12,8]}/><meshBasicMaterial color="#0c1725"/></mesh>)}
 <group position={[p.offsetX/1000,.04+f+h/2+.008,0]}><SiliconDie width={w} depth={1.72} thickness={h}/></group>
 <mesh position={[-w/2-.4,.04+f/2,.94]}><boxGeometry args={[.025,f,.02]}/><meshBasicMaterial color="#68e3f2"/></mesh>
 {[-1,1].map(i=><mesh key={i} position={[-w/2-.4,.04+f/2+i*f/2,.94]}><boxGeometry args={[.31,.025,.03]}/><meshBasicMaterial color="#68e3f2"/></mesh>)}
 </group>;
}
function cameraRegion(p:Parameters,stage:Stage){const l=getSceneLayout(p);if(stage==='align')return {x:l.centerX,w:l.fullWidth,d:l.fullDepth};if(['thin','laminate','dice','pickup'].includes(stage))return {x:l.waferX,w:2*l.baseRadius,d:2*l.baseRadius};return {x:l.substrateX,w:l.substrateWidth+1.5,d:l.substrateDepth+1.5};}

/** Refit the camera whenever the die changes size or the viewport is resized. */
function FitCamera({ p, mode, preset, stage }: { p: Parameters; mode: ViewMode; preset: CameraPreset; stage:Stage }) {
  const { camera, size } = useThree();
  const layout = getSceneLayout(p);
  const cross = mode === 'cross';
  const region=cameraRegion(p,stage);
  const target: [number, number, number] = cross ? [0, .10, 0] : [region.x, .9, 0];
  const fov = cross ? 38 : 43;
  const aspect = Math.max(.55, size.width / Math.max(1, size.height));
  const halfWidth = cross ? (Math.max(3, p.dieWidth * 1.4) + 3) / 2 : region.w / 2;
  const halfDepth = cross ? 2 : region.d / 2;
  const verticalTan = Math.tan(fov * Math.PI / 360);
  // Keep both objects visible even when a wide die increases tape diameter.
  const distance = cross
    ? Math.max(10, halfWidth / (verticalTan * aspect) * 1.24)
    : Math.max(12, halfWidth / (verticalTan * aspect) * 1.23, halfDepth / verticalTan * .85);

  useEffect(() => {
    const orbit: Record<CameraPreset, [number, number, number]> = {
      iso: [.37, .39, .83], top: [0, 1, .001],
      front: [0, .13, 1], side: [1, .16, 0],
    };
    const direction = cross ? [0, .19, 1] : orbit[preset];
    const length = Math.hypot(...direction);
    const scale = distance / length;
    camera.position.set(target[0] + direction[0] * scale, target[1] + direction[1] * scale, target[2] + direction[2] * scale);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, target[0], target[1], target[2], distance, cross, preset]);
  return null;
}

export default function SimulationScene({ params, results, stage, progress, viewMode, cameraPreset, showLabels, sceneLabels }: SceneProps) {
  const cross = viewMode === 'cross';
  const layout = getSceneLayout(params);
  const target: [number, number, number] = cross ? [0, .1, 0] : [cameraRegion(params,stage).x, .9, 0];
  const maxOrbit = Math.max(48, layout.fullWidth * 2.6);
  return <div className="scene-root">
    <Canvas key={`${viewMode}-${cameraPreset}-${stage}`} shadows dpr={[1, 1.75]} camera={{ position: [0, 15, 28], fov: cross ? 38 : 43, near: .08, far: 400 }} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#0c1725']} />
      <fog attach="fog" args={['#0c1725', 50, 120]} />
      <ambientLight intensity={1.05} />
      <hemisphereLight args={['#b8efff', '#0a1421', 2.25]} />
      <directionalLight position={[5, 14, 9]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={35} shadow-camera-bottom={-35} />
      <directionalLight position={[-9, 7, -6]} color="#4da6cb" intensity={.9} />
      {cross ? <CrossSection p={params} r={results} /> : <Assembly p={params} r={results} stage={stage} progress={progress} viewMode={viewMode} />}
      <OrbitControls makeDefault target={target} minDistance={cross ? 6 : 7} maxDistance={maxOrbit} maxPolarAngle={Math.PI * .91} enableDamping dampingFactor={.08} />
      <FitCamera p={params} mode={viewMode} preset={cameraPreset} stage={stage} />
    </Canvas>
    {showLabels && <>
      <div className="scene-label scene-label-left"><span className="tiny-dot" /> {cross ? (sceneLabels?.leftCross ?? 'SECTION VIEW · ADHESIVE GAP EXAGGERATED') : (sceneLabels?.leftAssembly ?? 'ASSEMBLY · PROCEDURAL 3D')}</div>
      <div className="scene-label scene-label-right">{cross ? (sceneLabels?.rightCross ?? 'BLT / DAF INSPECTION') : (sceneLabels?.rightAssembly ?? 'DRAG TO ORBIT · SCROLL TO ZOOM')}</div>
    </>}
  </div>;
}
