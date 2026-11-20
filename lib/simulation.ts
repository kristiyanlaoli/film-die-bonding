export type Stage = 'thin' | 'laminate' | 'dice' | 'pickup' | 'align' | 'place' | 'cure' | 'inspect';
export type SubstrateType = 'leadframe' | 'laminate';
export type ViewMode = 'assembly' | 'transparent' | 'cross';
export type CameraPreset = 'iso' | 'top' | 'front' | 'side';
export type Locale = 'id' | 'en' | 'zhTW';
export type Parameters = {
 dieWidth: number; dieHeight: number; substrate: SubstrateType;
 waferThickness: number; filmThickness: number; lamTemp: number; lamPressure: number;
 contamination: number; force: number; bondTemp: number; dwell: number;
 offsetX: number; offsetY: number; cureTemp: number; cureTime: number;
};
export const DEFAULT_PARAMS: Parameters = {dieWidth:4,dieHeight:4,substrate:'leadframe',waferThickness:100,filmThickness:25,lamTemp:65,lamPressure:.3,contamination:0,force:2.5,bondTemp:100,dwell:2,offsetX:5,offsetY:-3,cureTemp:165,cureTime:45};
export const STAGES: {id:Stage; duration:number; name:string; short:string}[] = [
 {id:'thin',duration:5,name:'Wafer thinning',short:'Thin'},
 {id:'laminate',duration:6,name:'DAF lamination',short:'Laminate'},
 {id:'dice',duration:6,name:'Wafer dicing',short:'Dice'},
 {id:'pickup',duration:5.5,name:'Die pick-up',short:'Pick'},
 {id:'align',duration:4,name:'Optical alignment',short:'Align'},
 {id:'place',duration:6,name:'Heated die attachment',short:'Attach'},
 {id:'cure',duration:5,name:'Adhesive curing',short:'Cure'},
 {id:'inspect',duration:4,name:'Final inspection',short:'Inspect'},
];
export const PRESETS: {key:string;name:string;description:string;overrides:Partial<Parameters>}[] = [
 {key:'ideal',name:'Nominal process',description:'Balanced DAF process',overrides:{}},
 {key:'low',name:'Poor lamination',description:'Low lamination heat and pressure',overrides:{lamTemp:35,lamPressure:.08}},
 {key:'high',name:'Excessive bonding force',description:'High bonding pressure on a small thin die',overrides:{dieWidth:2,dieHeight:2,waferThickness:50,force:7}},
 {key:'misalign',name:'Misalignment',description:'Deliberate X/Y offsets',overrides:{offsetX:150,offsetY:-130}},
 {key:'tilt',name:'Surface contamination',description:'Particles or nonuniform contact',overrides:{contamination:70}},
 {key:'void',name:'Incomplete cure',description:'Low cure temperature and time',overrides:{cureTemp:120,cureTime:15}},
];
export const clamp=(v:number,low:number,high:number)=>Math.max(low,Math.min(high,v));
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*clamp(t,0,1);
export const smooth=(t:number)=>{const s=clamp(t,0,1);return s*s*(3-2*s);};
export type Results={blt:number;coverage:number;voids:number;compression:number;placementError:number;tilt:number;damage:'Low'|'Elevated'|'High';delamination:'Low'|'Elevated'|'High';status:'PASS'|'FAIL';issues:{code:string;title:string;detail:string}[]};
export function getCureFraction(p:Parameters,progress:number){return clamp(progress*clamp((p.cureTemp-115)/50,0,1.4)*p.cureTime/45,0,1)}
export function temperatureAt(p:Parameters,progress:number){return Math.round(25+(p.cureTemp-25)*smooth(progress/.65))}
/** Illustrative, non-calibrated DAF model. Limits are teaching assumptions, not process specifications. */
export function computeResults(p:Parameters,cureProgress=1,locale:Locale='en'):Results {
 const pressure=p.force/(p.dieWidth*p.dieHeight); // N/mm² = MPa
 const lamDef=clamp(Math.max(0,55-p.lamTemp)/30+Math.max(0,p.lamTemp-85)/40+Math.max(0,.22-p.lamPressure)*4+Math.max(0,p.lamPressure-.55)*2,0,2);
 const attachDef=clamp(Math.max(0,85-p.bondTemp)/50+Math.max(0,p.bondTemp-135)/60+Math.max(0,.08-pressure)*7+Math.max(0,1.5-p.dwell)*.6,0,2);
 const compression=clamp(3+pressure*17+Math.max(0,p.bondTemp-100)*.12+Math.max(0,p.dwell-2)*.7,0,35);
 const blt=p.filmThickness*(1-compression/100);
 const coverage=clamp(99-9*lamDef-7*attachDef-p.contamination*.22,40,99.8);
 const voids=clamp(.5+4*lamDef+3*attachDef+p.contamination*.10,0,35);
 const placementError=Math.hypot(p.offsetX,p.offsetY);
 const tilt=clamp(.015+p.contamination*.003+lamDef*.035,0,.6);
 const damage:Results['damage']=pressure>.65*(p.waferThickness/100)**.6||compression>20?'High':pressure>.35*(p.waferThickness/100)**.6?'Elevated':'Low';
 const delamination:Results['delamination']=cureProgress<.8||coverage<85||voids>8?'High':cureProgress<.95||coverage<95||voids>4.5?'Elevated':'Low';
 const issues:Results['issues']=[];
 const issue=(code:string,condition:boolean,measured:string,copy:[string,string][])=>{if(condition){const [title,detail]=copy[locale==='en'?0:locale==='id'?1:2];issues.push({code,title,detail:measured+' · '+detail});}};
 issue('coverage',coverage<95,`${coverage.toFixed(1)}% / ≥95%`,[['Insufficient film contact','Review lamination and bonding conditions.'],['Kontak film kurang','Periksa laminasi dan kondisi bonding.'],['膠膜接觸不足','請檢查貼膜及固晶條件。']]);
 issue('voids',voids>4.5,`${voids.toFixed(1)}% / ≤4.5%`,[['Excessive estimated voids','Check lamination pressure, temperature and cleanliness.'],['Estimasi rongga terlalu tinggi','Periksa tekanan, suhu laminasi dan kebersihan.'],['預估空洞率過高','請檢查貼膜壓力、溫度及潔淨度。']]);
 issue('placement',placementError>50,`${placementError.toFixed(1)} µm / ≤50 µm`,[['Die misalignment','Correct the X/Y offsets.'],['Posisi die meleset','Koreksi offset X/Y.'],['晶粒對位偏移','請修正 X/Y 偏移量。']]);
 issue('tilt',tilt>.17,`${tilt.toFixed(3)}° / ≤0.170°`,[['Excessive die tilt','Check particles and uniform contact.'],['Die terlalu miring','Periksa partikel dan keseragaman kontak.'],['晶粒傾斜過大','請檢查異物及接觸均勻性。']]);
 issue('compression',compression>20,`${compression.toFixed(1)}% / ≤20%`,[['Excessive film compression','Reduce bonding pressure, temperature or dwell.'],['Kompresi film berlebih','Kurangi tekanan, suhu atau waktu bonding.'],['膠膜壓縮過大','請降低固晶壓力、溫度或時間。']]);
 issue('damage',damage==='High',`${pressure.toFixed(3)} MPa`,[['Die damage risk','Reduce force relative to die area and thickness.'],['Risiko kerusakan die','Kurangi gaya sesuai luas dan ketebalan die.'],['晶粒破損風險','請依晶粒面積及厚度降低固晶力。']]);
 issue('cure',cureProgress<.95,`${(cureProgress*100).toFixed(0)}% / ≥95%`,[['Incomplete curing','Check the material-specific thermal recipe.'],['Curing belum cukup','Periksa resep termal sesuai material.'],['固化不足','請檢查材料適用的固化條件。']]);
 return {blt,coverage,voids,compression,placementError,tilt,damage,delamination,status:issues.length?'FAIL':'PASS',issues};
}
