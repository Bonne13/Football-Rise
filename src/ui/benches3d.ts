import type * as T from 'three';
import type { StadiumProfile } from '../data/stadiums.js';
import { benchLayout } from './bench-layout.js';
declare const THREE:typeof T;

export function buildBenches(scene:T.Scene,profile:StadiumProfile,colors:{primary:string;secondary:string}) {
  const layout=benchLayout(profile),seats:T.Vector3[][]=[];
  const mat=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.7});
  const frame=mat('#4a5359'),seat=mat(colors.primary),pale=mat(colors.secondary),wood=mat('#8c6847');
  const panel=new THREE.MeshStandardMaterial({color:'#86a2ad',transparent:true,opacity:.42,roughness:.3,side:THREE.DoubleSide});
  for(const z of [layout.homeZ,layout.awayZ]){
    const group=new THREE.Group();group.name='team-dugout';group.position.set(layout.x,0,z);scene.add(group);
    const box=(size:[number,number,number],at:[number,number,number],material:T.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...at);mesh.castShadow=true;group.add(mesh);};
    box([2.7,.08,layout.length+1],[0,.04,0],frame);
    for(const end of [-1,1]){
      box([.09,2.2,.09],[-1.1,1.1,end*layout.length/2],frame);
      if(layout.covered)box([2.1,1.9,.06],[-.1,1.2,end*layout.length/2],layout.style==='glass'?panel:pale);
    }
    if(layout.covered){box([2.6,.12,layout.length+.3],[0,2.3,0],layout.style==='canopy'?pale:panel);box([.07,1.8,layout.length],[-1.1,1.2,0],panel);}
    const row:T.Vector3[]=[];
    for(let i=0;i<layout.seats;i++){
      const localZ=(i-(layout.seats-1)/2)*.72;
      box([.55,.12,.6],[0,.48,localZ],layout.style==='wood'?wood:seat);
      box([.12,.6,.6],[-.25,.81,localZ],layout.style==='wood'?wood:seat);
      box([.12,.4,.45],[0,.24,localZ],frame);
      row.push(new THREE.Vector3(layout.x,.7,z+localZ));
    }
    seats.push(row);
    // Technical area remains beside the touchline, never across the pitch.
    const points=[[-35.6,z-layout.length/2-1],[-34.8,z-layout.length/2-1],[-34.8,z+layout.length/2+1],[-35.6,z+layout.length/2+1]].map(([x,z])=>new THREE.Vector3(x,.025,z));
    const area=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:'#e8eee1',dashSize:.3,gapSize:.2}));area.computeLineDistances();scene.add(area);
  }
  return {layout,seats};
}
