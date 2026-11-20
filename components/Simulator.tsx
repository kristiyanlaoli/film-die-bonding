'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import LanguageFlag from '@/components/LanguageFlag';
import {
  Activity, AlertTriangle, Check, CheckCircle2, ChevronDown,
  CircleHelp, ClipboardList, Clock3, Cpu, Crosshair, Droplets,
  Eye, Gauge, Layers, Maximize2, Move3D, Pause, Play, RotateCcw,
  ScanLine, Settings2, SkipBack, SkipForward, SlidersHorizontal,
  Thermometer, Timer, WandSparkles, XCircle, Zap
} from 'lucide-react';
import {
  CameraPreset, clamp, computeResults, DEFAULT_PARAMS, getCureFraction,
  Parameters, PRESETS, Results, STAGES, Stage, temperatureAt, ViewMode, Locale
} from '@/lib/simulation';

const SimulationScene = dynamic(() => import('@/components/SimulationScene'), {
  ssr: false,
  loading: () => <div className="scene-loading">Preparing 3D process viewport…</div>,
});

const durations = STAGES.map(s => s.duration);
const elapsedStarts = durations.map((_, i) => durations.slice(0, i).reduce((a, b) => a + b, 0));
const totalDuration = durations.reduce((a, b) => a + b, 0);

function locatePlayhead(t: number): { index: number; progress: number } {
  if (t >= totalDuration) return { index: STAGES.length - 1, progress: 1 };
  for (let i = durations.length - 1; i >= 0; i--) {
    if (t >= elapsedStarts[i]) return { index: i, progress: clamp((t - elapsedStarts[i]) / durations[i], 0, 1) };
  }
  return { index: 0, progress: 0 };
}

function formatNumber(v: number, digits = 1) { return Number(v.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits }); }

function RangeField({ label, value, onChange, min, max, step = 1, unit, hint }: {
  label: string; value: number; onChange: (n: number) => void; min: number; max: number;
  step?: number; unit: string; hint?: string;
}) {
  const pct = clamp((value - min) / (max - min) * 100, 0, 100);
  return <label className="range-field">
    <span className="range-title"><span>{label}{hint && <span className="field-hint" title={hint}><CircleHelp size={12}/></span>}</span><b>{formatNumber(value, step < 1 ? 2 : 1)} <small>{unit}</small></b></span>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ '--percent': `${pct}%` } as React.CSSProperties}/>
    <span className="range-limits"><span>{min}</span><span>{max}</span></span>
  </label>;
}

function SelectField<T extends string>({ label, value, onChange, options, hint }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; hint?: string;
}) {
  return <label className="select-field"><span>{label}{hint && <span className="field-hint" title={hint}><CircleHelp size={12}/></span>}</span>
    <span className="select-wrap"><select value={value} onChange={e => onChange(e.target.value as T)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={14}/></span>
  </label>;
}

function Metric({ label, value, unit, detail, severity }: { label: string; value: number | string; unit?: string; detail?: string; severity?: 'good' | 'warn' | 'bad' }) {
  return <div className="metric">
    <div className="metric-name">{label}<span className={`indicator ${severity || 'neutral'}`}/></div>
    <div className="metric-value">{typeof value === 'number' ? formatNumber(value, 1) : value}<small>{unit}</small></div>
    {detail && <div className="metric-detail">{detail}</div>}
  </div>;
}



type Language = Locale;

const UI_COPY = {
  id: {
    isoTitle: "Isometrik", topTitle: "Atas", frontTitle: "Depan", sideTitle: "Samping", iso: "ISO", top: "ATAS", front: "DEPAN", side: "SISI",
    waferThickness: "Ketebalan wafer", lamPressure: "Tekanan laminasi", bondTemp: "Suhu bonding", dwell: "Waktu bonding", filmLegend: "Emas: DAF · Biru: silikon · Hijau: dicing tape", nextBackend: "Berikutnya: wire bonding / backend assembly", step: "TAHAP", die: "Die",
    loadingScene: 'Menyiapkan viewport proses 3D…',
    brandSubtitle: 'Perakitan semikonduktor · Kembaran digital interaktif',
    simOnline: 'SIMULASI ONLINE',
    pasteType: "ADHESIVE TIPE FILM",
    educationalModel: 'MODEL EDUKATIF',
    workflow: 'ALUR / 01',
    bondingProcess: 'Proses bonding',
    conventionalFaceUp: 'Die attach konvensional · Face up',
    processStages: 'Tahapan proses',
    processScenarios: 'SKENARIO PROSES',
    asideNotice: "Coba preset laminasi buruk atau kontaminasi, lalu bandingkan hasil inspeksi.",
    liveProcessView: 'TAMPILAN PROSES LANGSUNG',
    currentStep: 'STEP SAAT INI',
    stepProgress: 'PROGRES STEP',
    cuLeadframe: 'Leadframe Cu',
    laminate: 'Laminate',
    allChecksSatisfied: 'Seluruh pemeriksaan inspeksi lolos',
    failedChecks: (n:number)=> `${n} pemeriksaan inspeksi gagal`,
    sectionView: 'SECTION VIEW',
    bltApprox: 'Bond Line Thickness ≈',
    crossNote: "Ketebalan film diperbesar untuk visualisasi.",
    assembly: 'Assembly',
    transparent: 'Transparan',
    crossSection: 'Cross-section',
    crossSectionDisabled: 'Cross-section tersedia saat placement',
    inspectBonded: 'Periksa adhesive yang sudah dibonding',
    hideLabels: 'Sembunyikan',
    showLabels: 'Tampilkan',
    labels: 'label',
    processTimeline: 'TIMELINE PROSES',
    simTime: 'WAKTU SIM',
    previousStage: 'Step sebelumnya',
    reset: 'Reset',
    runSimulation: 'Jalankan Simulasi',
    pauseSimulation: 'Jeda Simulasi',
    replaySimulation: 'Ulangi Simulasi',
    nextStage: 'Step berikutnya',
    speed: 'KECEPATAN',
    engineeringExplanation: 'Penjelasan Engineering',
    eventMonitor: 'Monitor Event',
    running: 'BERJALAN',
    ready: 'SIAP',
    systemLog: 'Log sistem',
    equipmentConfiguration: 'KONFIGURASI PERALATAN',
    processControls: 'Kontrol proses',
    process: 'Process',
    materialAndCure: 'Material & Cure',
    dieAndSubstrate: 'DIE & SUBSTRATE',
    dieWidth: 'Lebar die',
    dieLength: 'Panjang die',
    substrateType: 'Tipe substrate',
    copperLeadframe: 'Leadframe tembaga',
    organicLaminate: 'Laminate organik',
    dispensing: "LAMINASI DAF",
    epoxyVolume: "Ketebalan film",
    nozzleGap: "Suhu laminasi",
    dispenseImbalance: "Kontaminasi permukaan",
    placement: 'PLACEMENT',
    bondingForce: "Gaya bonding",
    xPlacementOffset: 'Offset placement X',
    yPlacementOffset: 'Offset placement Y',
    epoxyProperties: "PARAMETER FILM",
    curingRecipe: 'RESEP CURING',
    cureTemperature: 'Suhu curing',
    cureDuration: 'Durasi curing',
    thermalNote: "Contoh film termoset. Suhu, waktu dan batas kualitas adalah asumsi edukatif; ikuti spesifikasi DAF untuk proses nyata.",
    liveCuringReadout: 'PEMBACAAN CURING LANGSUNG',
    chamberTemp: 'Suhu chamber',
    estimatedCure: 'Estimasi cure',
    modeledOutputs: 'OUTPUT TERHITUNG',
    bondQuality: 'Kualitas bonding',
    metricEstimatedFilmGap: 'Perkiraan celah film',
    metricEstimatedDieArea: "Area kontak estimasi",
    metricSqueezeOut: "Perubahan ketebalan",
    metricXYDeviation: 'Deviasi X/Y',
    metricSimplifiedTilt: 'Tilt sederhana',
    metricHeuristicOnly: 'Hanya heuristik',
    metricBLT: 'BOND LINE THICKNESS',
    metricCoverage: "KONTAK FILM",
    metricFillet: "KOMPRESI FILM",
    metricPlacementError: 'PLACEMENT ERROR',
    metricTilt: 'DIE TILT',
    metricVoids: 'ESTIMATED VOIDS',
    bleedRisk: "RISIKO KERUSAKAN DIE",
    delamination: 'DELAMINATION',
    low: 'Rendah', elevated: 'Sedang', high: 'Tinggi',
    inspectionVerdict: 'Verdict inspeksi',
    passSuccessful: 'PASS — Bonding berhasil',
    failUnsuccessful: 'FAIL — Bonding gagal',
    passAllParams: 'Semua parameter lolos batas simulasi.',
    failParamCount: (n:number)=> `${n} parameter tidak memenuhi batas simulasi.`,
    passDetail: "Kontak film, kompresi, posisi, kemiringan, rongga, risiko kerusakan dan curing memenuhi batas edukatif.",
    projectedAfterFullCure: 'Diproyeksikan setelah full cure. ',
    cureInProgress: 'Curing masih berlangsung. ',
    disclaimer: 'PASS/FAIL dan semua nilai adalah estimasi edukatif—bukan batas kualifikasi industri.',
    footerProcess: "TIPIS → LAMINASI → DICING → PICK → ALIGN → ATTACH → CURE → INSPEKSI",
    footerModel: "DAF v1.0 · MODEL EDUKATIF",
    languageLabel: 'Bahasa',
    sceneLeftAssembly: 'ASSEMBLY · PROSEDURAL 3D',
    sceneLeftCross: 'SECTION VIEW · CELAH ADHESIVE DIBESARKAN',
    sceneRightAssembly: 'GESER UNTUK ORBIT · SCROLL UNTUK ZOOM',
    sceneRightCross: "INSPEKSI BLT / DAF",
    logInit: "Simulasi siap · Penipisan wafer",
    logPresetLoaded: (name:string)=> `Preset dimuat · ${name}`,
    logProcessReset: 'Proses direset · Step 01',
    logStage: (n:number, name:string)=> `Step ${String(n).padStart(2,'0')} · ${name}`,
  },
  en: {
    isoTitle: "Isometric view", topTitle: "Top view", frontTitle: "Front view", sideTitle: "Side view", iso: "ISO", top: "TOP", front: "FRONT", side: "SIDE",
    waferThickness: "Wafer thickness", lamPressure: "Lamination pressure", bondTemp: "Bonding temperature", dwell: "Bonding dwell", filmLegend: "Gold: DAF · Blue: silicon · Teal: dicing tape", nextBackend: "Next: wire bonding / backend assembly", step: "STEP", die: "Die",
    loadingScene: 'Preparing 3D process viewport…',
    brandSubtitle: 'Semiconductor assembly · Interactive digital twin',
    simOnline: 'SIMULATION ONLINE',
    pasteType: "FILM TYPE ADHESIVE · DAF", educationalModel: 'EDUCATIONAL MODEL', workflow: 'WORKFLOW / 01', bondingProcess: 'Bonding process', conventionalFaceUp: 'Conventional die attach · Face up', processStages: 'Process stages', processScenarios: 'PROCESS SCENARIOS', asideNotice: "Try poor lamination or surface contamination and compare the inspection results.", liveProcessView: 'LIVE PROCESS VIEW', currentStep: 'CURRENT STEP', stepProgress: 'STEP PROGRESS', cuLeadframe: 'Cu Leadframe', laminate: 'Laminate', allChecksSatisfied: 'All inspection checks satisfied', failedChecks: (n:number)=> `${n} failed inspection check${n !== 1 ? 's' : ''}`, sectionView: 'SECTION VIEW', bltApprox: 'Bond Line Thickness ≈', crossNote: "Film thickness is exaggerated for clarity.", assembly: 'Assembly', transparent: 'Transparent', crossSection: 'Cross-section', crossSectionDisabled: 'Cross-section becomes available during placement', inspectBonded: 'Inspect the bonded adhesive', hideLabels: 'Hide', showLabels: 'Show', labels: 'labels', processTimeline: 'PROCESS TIMELINE', simTime: 'SIM TIME', previousStage: 'Previous stage', reset: 'Reset', runSimulation: 'Run Simulation', pauseSimulation: 'Pause Simulation', replaySimulation: 'Replay Simulation', nextStage: 'Next stage', speed: 'SPEED', engineeringExplanation: 'Engineering Explanation', eventMonitor: 'Event Monitor', running: 'RUNNING', ready: 'READY', systemLog: 'System log', equipmentConfiguration: 'EQUIPMENT CONFIGURATION', processControls: 'Process controls', process: 'Process', materialAndCure: 'Material & Cure', dieAndSubstrate: 'DIE & SUBSTRATE', dieWidth: 'Die width', dieLength: 'Die length', substrateType: 'Substrate type', copperLeadframe: 'Copper leadframe', organicLaminate: 'Organic laminate', dispensing: "DAF LAMINATION", epoxyVolume: "Film thickness", nozzleGap: "Lamination temperature", dispenseImbalance: "Surface contamination", placement: 'PLACEMENT', bondingForce: "Bonding force", xPlacementOffset: 'X placement offset', yPlacementOffset: 'Y placement offset', epoxyProperties: "FILM PARAMETERS", curingRecipe: 'CURING RECIPE', cureTemperature: 'Cure temperature', cureDuration: 'Cure duration', thermalNote: "Thermosetting film example. Temperatures, times and quality limits are teaching assumptions; use the DAF supplier specification for production.", liveCuringReadout: 'LIVE CURING READOUT', chamberTemp: 'Chamber temp.', estimatedCure: 'Estimated cure', modeledOutputs: 'MODELED OUTPUTS', bondQuality: 'Bond quality', metricEstimatedFilmGap: 'Estimated film gap', metricEstimatedDieArea: "Estimated contact area", metricSqueezeOut: "Thickness reduction", metricXYDeviation: 'X/Y deviation', metricSimplifiedTilt: 'Simplified tilt', metricHeuristicOnly: 'Heuristic only', metricBLT: 'BOND LINE THICKNESS', metricCoverage: "FILM CONTACT", metricFillet: "FILM COMPRESSION", metricPlacementError: 'PLACEMENT ERROR', metricTilt: 'DIE TILT', metricVoids: 'ESTIMATED VOIDS', bleedRisk: "DIE DAMAGE RISK", delamination: 'DELAMINATION', low: 'Low', elevated: 'Elevated', high: 'High', inspectionVerdict: 'Inspection verdict', passSuccessful: 'PASS — Bonding successful', failUnsuccessful: 'FAIL — Bonding unsuccessful', passAllParams: 'All parameters satisfy the simulation limits.', failParamCount: (n:number)=> `${n} parameter${n !== 1 ? 's' : ''} failed the simulation limits.`, passDetail: "Film contact, compression, alignment, tilt, voids, damage risk and cure meet the educational limits.", projectedAfterFullCure: 'Projected after full cure. ', cureInProgress: 'Cure is still in progress. ', disclaimer: 'PASS/FAIL and all measurements are educational estimates—not industrial qualification limits.', footerProcess: "THIN → LAMINATE → DICE → PICK → ALIGN → ATTACH → CURE → INSPECT", footerModel: "DAF v1.0 · EDUCATIONAL MODEL", languageLabel: 'Language', sceneLeftAssembly: 'ASSEMBLY · PROCEDURAL 3D', sceneLeftCross: 'SECTION VIEW · ADHESIVE GAP EXAGGERATED', sceneRightAssembly: 'DRAG TO ORBIT · SCROLL TO ZOOM', sceneRightCross: "BLT / DAF INSPECTION", logInit: "Simulation ready · Wafer thinning", logPresetLoaded: (name:string)=> `Preset loaded · ${name}`, logProcessReset: 'Process reset · Stage 01', logStage: (n:number, name:string)=> `Stage ${String(n).padStart(2,'0')} · ${name}`,
  },
  zhTW: {
    isoTitle: "等角視圖", topTitle: "俯視圖", frontTitle: "正視圖", sideTitle: "側視圖", iso: "等角", top: "俯視", front: "正視", side: "側視",
    waferThickness: "晶圓厚度", lamPressure: "貼膜壓力", bondTemp: "固晶溫度", dwell: "固晶時間", filmLegend: "金色：DAF · 藍色：矽 · 青色：切割膠帶", nextBackend: "下一步：打線接合／後段組裝", step: "步驟", die: "晶粒",
    loadingScene: '正在準備 3D 製程視窗…', brandSubtitle: '半導體封裝組裝 · 互動式數位分身', simOnline: '模擬上線中', pasteType: "晶粒黏著膠膜（DAF）", educationalModel: '教學模型', workflow: '流程 / 01', bondingProcess: '鍵合流程', conventionalFaceUp: '傳統晶粒貼裝 · 正面朝上', processStages: '流程階段', processScenarios: '製程情境', asideNotice: "試試貼膜不良或表面污染，再比較檢查結果。", liveProcessView: '即時製程視圖', currentStep: '目前步驟', stepProgress: '步驟進度', cuLeadframe: '銅導線架', laminate: '基板', allChecksSatisfied: '所有檢查皆通過', failedChecks: (n:number)=> `${n} 項檢查未通過`, sectionView: '截面視圖', bltApprox: '鍵合層厚度 ≈', crossNote: "膠膜厚度已放大以便觀察。", assembly: '組裝', transparent: '透明', crossSection: '截面', crossSectionDisabled: '截面模式會在貼裝階段後開放', inspectBonded: '檢視已鍵合的黏著層', hideLabels: '隱藏', showLabels: '顯示', labels: '標籤', processTimeline: '製程時間軸', simTime: '模擬時間', previousStage: '上一階段', reset: '重設', runSimulation: '執行模擬', pauseSimulation: '暫停模擬', replaySimulation: '重新播放', nextStage: '下一階段', speed: '速度', engineeringExplanation: '工程說明', eventMonitor: '事件監控', running: '執行中', ready: '就緒', systemLog: '系統紀錄', equipmentConfiguration: '設備設定', processControls: '流程控制', process: '流程', materialAndCure: '材料與固化', dieAndSubstrate: '晶粒與基板', dieWidth: '晶粒寬度', dieLength: '晶粒長度', substrateType: '基板類型', copperLeadframe: '銅導線架', organicLaminate: '有機基板', dispensing: "DAF 貼膜", epoxyVolume: "膠膜厚度", nozzleGap: "貼膜溫度", dispenseImbalance: "表面污染", placement: '貼裝', bondingForce: "固晶力", xPlacementOffset: 'X 貼裝偏移', yPlacementOffset: 'Y 貼裝偏移', epoxyProperties: "膠膜參數", curingRecipe: '固化條件', cureTemperature: '固化溫度', cureDuration: '固化時間', thermalNote: "熱固型膠膜示例。溫度、時間與品質界限為教學假設，量產須依 DAF 供應商規格。", liveCuringReadout: '即時固化讀值', chamberTemp: '腔體溫度', estimatedCure: '估計固化率', modeledOutputs: '模擬輸出', bondQuality: '鍵合品質', metricEstimatedFilmGap: '估計膠層間隙', metricEstimatedDieArea: "預估接觸面積", metricSqueezeOut: "厚度減少比例", metricXYDeviation: 'X/Y 偏差', metricSimplifiedTilt: '簡化傾斜', metricHeuristicOnly: '僅為啟發式估算', metricBLT: '鍵合層厚度', metricCoverage: "膠膜接觸率", metricFillet: "膠膜壓縮率", metricPlacementError: '貼裝誤差', metricTilt: '晶粒傾斜', metricVoids: '估計空洞率', bleedRisk: "晶粒破損風險", delamination: '分層風險', low: '低', elevated: '中', high: '高', inspectionVerdict: '檢查結果', passSuccessful: 'PASS — 鍵合成功', failUnsuccessful: 'FAIL — 鍵合失敗', passAllParams: '所有參數皆符合模擬限制。', failParamCount: (n:number)=> `${n} 項參數不符合模擬限制。`, passDetail: "膠膜接觸、壓縮、對位、傾斜、空洞、破損風險及固化均符合教學限制。", projectedAfterFullCure: '以下為完全固化後之預估。', cureInProgress: '固化仍在進行中。 ', disclaimer: 'PASS/FAIL 與所有數值皆為教學估算，並非工業量產品質判定標準。', footerProcess: "薄化 → 貼膜 → 切割 → 取晶 → 對位 → 固晶 → 固化 → 檢查", footerModel: "DAF v1.0 · 教學模型", languageLabel: '語言', sceneLeftAssembly: '組裝 · 程序化 3D', sceneLeftCross: '截面視圖 · 黏著層間隙已放大', sceneRightAssembly: '拖曳旋轉 · 滾輪縮放', sceneRightCross: "BLT / 膠膜檢查", logInit: "模擬就緒 · 晶圓薄化", logPresetLoaded: (name:string)=> `已載入預設 · ${name}`, logProcessReset: '流程已重設 · Step 01', logStage: (n:number, name:string)=> `步驟 ${String(n).padStart(2,'0')} · ${name}`,
  },
} as const;

const STAGE_COPY: Record<Language, Record<Stage, {name:string;short:string;device:string;explanation:string;purpose:string;issue:string}>> = {
  "en": {
    "thin": {
      "name": "Wafer thinning",
      "short": "Thin",
      "device": "Backgrinder / chuck",
      "explanation": "A grinding wheel reduces the wafer thickness before DAF lamination. A nine-die wafer coupon represents the wafer.",
      "purpose": "Prepare a thin silicon wafer for compact packages.",
      "issue": "Thin wafers require careful handling to avoid cracking."
    },
    "laminate": {
      "name": "DAF lamination",
      "short": "Laminate",
      "device": "Heated lamination roller",
      "explanation": "A preformed adhesive film is laminated to the wafer backside using heat and pressure. The film is distinct from the removable dicing tape.",
      "purpose": "Establish a controlled adhesive thickness.",
      "issue": "Poor lamination or particles can trap air."
    },
    "dice": {
      "name": "Wafer dicing",
      "short": "Dice",
      "device": "Dicing saw / tape frame",
      "explanation": "The wafer and DAF are singulated. The resulting dies retain individual film pieces on the backside; the dicing tape supports them.",
      "purpose": "Separate identical dies while retaining the adhesive.",
      "issue": "Chipping or film tearing can occur."
    },
    "pickup": {
      "name": "Die pick-up",
      "short": "Pick",
      "device": "Ejector pins / vacuum collet",
      "explanation": "Pins beneath the tape assist release as the collet approaches. The die and its DAF lift together while the dicing tape stays behind.",
      "purpose": "Transfer the film-backed die, active face up.",
      "issue": "Poor release or excessive force can damage thin dies."
    },
    "align": {
      "name": "Optical alignment",
      "short": "Align",
      "device": "Vision camera / motion stage",
      "explanation": "The collet carries the film-backed die over the clean substrate and aligns it to the die pad.",
      "purpose": "Reduce X/Y placement error.",
      "issue": "Misalignment affects assembly clearance."
    },
    "place": {
      "name": "Heated die attachment",
      "short": "Attach",
      "device": "Heated stage / bonding head",
      "explanation": "The pre-attached film contacts the pad. Heat, force and dwell promote contact and slight film compression; no paste is dispensed.",
      "purpose": "Obtain a uniform bond line and sufficient contact.",
      "issue": "Poor contact, trapped air or excessive force can reduce quality."
    },
    "cure": {
      "name": "Adhesive curing",
      "short": "Cure",
      "device": "Thermal curing station",
      "explanation": "A representative thermosetting DAF hardens with a material-dependent thermal recipe. Time is accelerated.",
      "purpose": "Build a durable bond for subsequent assembly.",
      "issue": "Insufficient cure increases delamination risk."
    },
    "inspect": {
      "name": "Final inspection",
      "short": "Inspect",
      "device": "Optical / section inspection",
      "explanation": "Review modeled film thickness, contact, voids and placement. Wire bonding or backend assembly follows die attachment.",
      "purpose": "Compare process inputs and estimated defects.",
      "issue": "Results are heuristic estimates, not measured product qualification."
    }
  },
  "id": {
    "thin": {
      "name": "Penipisan wafer",
      "short": "Tipis",
      "device": "Backgrinder / chuck",
      "explanation": "Roda gerinda menipiskan wafer sebelum laminasi DAF. Model menampilkan bagian wafer berisi sembilan die.",
      "purpose": "Menyiapkan wafer tipis untuk kemasan ringkas.",
      "issue": "Wafer tipis rentan retak."
    },
    "laminate": {
      "name": "Laminasi DAF",
      "short": "Laminasi",
      "device": "Roller laminasi berpemanas",
      "explanation": "Film perekat dilaminasi ke sisi belakang wafer menggunakan panas dan tekanan. Film berbeda dari dicing tape yang dapat dilepas.",
      "purpose": "Mengatur ketebalan lapisan perekat.",
      "issue": "Laminasi buruk atau partikel dapat menjebak udara."
    },
    "dice": {
      "name": "Pemotongan wafer",
      "short": "Dicing",
      "device": "Gergaji dicing / frame",
      "explanation": "Wafer dan DAF dipotong menjadi die individual. Film tetap menempel di belakang tiap die, sementara dicing tape menopangnya.",
      "purpose": "Memisahkan die seragam dengan film tetap menempel.",
      "issue": "Tepi die atau film dapat rusak."
    },
    "pickup": {
      "name": "Pengambilan die",
      "short": "Pick",
      "device": "Ejector pin / vacuum collet",
      "explanation": "Pin dari bawah tape membantu pelepasan ketika collet mendekat. Die dan DAF terangkat bersama; dicing tape tertinggal.",
      "purpose": "Memindahkan die dengan sisi aktif di atas.",
      "issue": "Gaya berlebihan dapat merusak die tipis."
    },
    "align": {
      "name": "Penyelarasan optik",
      "short": "Align",
      "device": "Kamera / motion stage",
      "explanation": "Collet membawa die berfilm ke atas substrate bersih dan menyelaraskannya dengan die pad.",
      "purpose": "Mengurangi error X/Y.",
      "issue": "Posisi meleset mengurangi clearance."
    },
    "place": {
      "name": "Bonding die berpemanas",
      "short": "Attach",
      "device": "Heated stage / bonding head",
      "explanation": "Film menyentuh pad. Panas, gaya dan waktu membantu kontak serta sedikit kompresi film tanpa dispensing paste.",
      "purpose": "Membentuk BLT seragam dan kontak yang cukup.",
      "issue": "Kontak buruk, rongga atau gaya berlebihan mengurangi kualitas."
    },
    "cure": {
      "name": "Pengerasan perekat",
      "short": "Cure",
      "device": "Stasiun curing termal",
      "explanation": "Contoh DAF termoset mengeras dengan resep termal sesuai material. Waktu dipercepat.",
      "purpose": "Membentuk ikatan untuk perakitan berikutnya.",
      "issue": "Curing kurang meningkatkan risiko delaminasi."
    },
    "inspect": {
      "name": "Inspeksi akhir",
      "short": "Inspeksi",
      "device": "Inspeksi optik / penampang",
      "explanation": "Tinjau estimasi ketebalan film, kontak, rongga dan posisi. Berikutnya adalah wire bonding atau backend assembly.",
      "purpose": "Membandingkan parameter dan estimasi cacat.",
      "issue": "Hasil bersifat heuristik, bukan kualifikasi produk nyata."
    }
  },
  "zhTW": {
    "thin": {
      "name": "晶圓薄化",
      "short": "薄化",
      "device": "背磨機／載台",
      "explanation": "研磨輪將晶圓減薄，再進行 DAF 貼膜。此模型以九顆晶粒的晶圓區塊示意。",
      "purpose": "為薄型封裝準備薄晶圓。",
      "issue": "薄晶圓容易破裂，須小心操作。"
    },
    "laminate": {
      "name": "DAF 貼膜",
      "short": "貼膜",
      "device": "加熱貼膜滾輪",
      "explanation": "以熱與壓力將預製黏著膠膜貼合於晶圓背面。DAF 與可移除的切割膠帶不同。",
      "purpose": "控制黏著層厚度。",
      "issue": "貼膜不良或異物可能造成氣泡。"
    },
    "dice": {
      "name": "晶圓切割",
      "short": "切割",
      "device": "切割機／膠帶框架",
      "explanation": "晶圓與 DAF 切割成個別晶粒。每顆晶粒背面保留膠膜，由切割膠帶支撐。",
      "purpose": "分離尺寸一致且帶膠膜的晶粒。",
      "issue": "可能發生崩邊或膠膜撕裂。"
    },
    "pickup": {
      "name": "晶粒取件",
      "short": "取晶",
      "device": "頂針／真空吸嘴",
      "explanation": "吸嘴靠近時，膠帶下方頂針輔助剝離。晶粒與 DAF 一同取出，切割膠帶留在原位。",
      "purpose": "以主動面朝上的方式搬運晶粒。",
      "issue": "剝離不良或過大力量可能損傷薄晶粒。"
    },
    "align": {
      "name": "光學對位",
      "short": "對位",
      "device": "視覺相機／移動平台",
      "explanation": "吸嘴將帶膠膜的晶粒移至乾淨基板上方，並對準固晶區。",
      "purpose": "降低 X/Y 貼裝誤差。",
      "issue": "對位偏移影響封裝間距。"
    },
    "place": {
      "name": "加熱固晶",
      "short": "固晶",
      "device": "加熱載台／固晶頭",
      "explanation": "膠膜接觸固晶區，透過熱、力及保壓時間促進接觸並略微壓縮膠膜，不需點膠。",
      "purpose": "獲得均勻膠層厚度與充分接觸。",
      "issue": "接觸不良、空洞或過大力量會降低品質。"
    },
    "cure": {
      "name": "黏著劑固化",
      "short": "固化",
      "device": "熱固化設備",
      "explanation": "熱固型 DAF 依材料適用的熱處理條件固化。動畫時間已加速。",
      "purpose": "形成穩定接合以利後續組裝。",
      "issue": "固化不足會增加分層風險。"
    },
    "inspect": {
      "name": "最終檢查",
      "short": "檢查",
      "device": "光學／截面檢查",
      "explanation": "查看預估膠層厚度、接觸率、空洞及貼裝誤差。後續進行打線接合或後段組裝。",
      "purpose": "比較製程參數與預估缺陷。",
      "issue": "結果為教學估算，非實際產品驗證。"
    }
  }
};
const PRESET_COPY: Record<Language,Record<string,{name:string;description:string}>> = {
  "id": {
    "ideal": {
      "name": "Proses nominal",
      "description": "Kondisi DAF seimbang"
    },
    "low": {
      "name": "Laminasi buruk",
      "description": "Suhu dan tekanan laminasi rendah"
    },
    "high": {
      "name": "Gaya berlebih",
      "description": "Tekanan tinggi pada die kecil dan tipis"
    },
    "misalign": {
      "name": "Salah posisi",
      "description": "Offset X/Y disengaja"
    },
    "tilt": {
      "name": "Kontaminasi",
      "description": "Partikel atau kontak tidak merata"
    },
    "void": {
      "name": "Curing kurang",
      "description": "Suhu dan durasi curing rendah"
    }
  },
  "zhTW": {
    "ideal": {
      "name": "標準製程",
      "description": "平衡的 DAF 製程"
    },
    "low": {
      "name": "貼膜不良",
      "description": "貼膜溫度與壓力偏低"
    },
    "high": {
      "name": "固晶力過大",
      "description": "小型薄晶粒承受過高壓力"
    },
    "misalign": {
      "name": "對位偏移",
      "description": "刻意設定 X/Y 偏移"
    },
    "tilt": {
      "name": "表面污染",
      "description": "異物或接觸不均"
    },
    "void": {
      "name": "固化不足",
      "description": "固化溫度與時間偏低"
    }
  },
  "en": {}
};

function riskText(language: Language, value: 'Low' | 'Elevated' | 'High') {
  const t = UI_COPY[language];
  return value === 'Low' ? t.low : value === 'Elevated' ? t.elevated : t.high;
}

function iconForStage(index: number) {
  switch (index) {
    case 0: return <Settings2 size={16}/>;
    case 1: return <Layers size={16}/>;
    case 2: return <ScanLine size={16}/>;
    case 3: return <Move3D size={16}/>;
    case 4: return <Crosshair size={16}/>;
    case 5: return <Move3D size={16}/>;
    case 6: return <Thermometer size={16}/>;
    default: return <ScanLine size={16}/>;
  }
}

export default function Simulator() {
  const [language, setLanguage] = useState<Language>('en');
  const [params, setParams] = useState<Parameters>(DEFAULT_PARAMS);
  const [preset, setPreset] = useState('ideal');
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [panelTab, setPanelTab] = useState<'process' | 'material'>('process');
  const [viewMode, setViewMode] = useState<ViewMode>('assembly');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');
  const [showLabels, setShowLabels] = useState(true);
  const [detailPanel, setDetailPanel] = useState<'engineering' | 'events' | null>(null);
  const [eventLog, setEventLog] = useState<{type:'init'|'reset'|'preset'|'stage';key?:string;index?:number}[]>([{type:'init'}]);
  const lastIndex = useRef(0);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.lang = language === 'zhTW' ? 'zh-TW' : language;
  }, [language]);

  const t = UI_COPY[language];
  const stageDefs = useMemo(() => STAGES.map(s => ({ ...s, ...STAGE_COPY[language][s.id] })), [language]);
  const presetDefs = useMemo(() => PRESETS.map(s => ({ ...s, ...(PRESET_COPY[language][s.key] || { name: s.name, description: s.description }) })), [language]);
  const sceneLabels = useMemo(() => ({ leftAssembly: t.sceneLeftAssembly, leftCross: t.sceneLeftCross, rightAssembly: t.sceneRightAssembly, rightCross: t.sceneRightCross }), [t]);
  const { index: stageIndex, progress } = locatePlayhead(playhead);
  const stage = stageDefs[stageIndex];
  const completed = playhead >= totalDuration;
  const cureFactor = stageIndex < 6 ? 1 : getCureFraction(params, stageIndex > 6 ? 1 : progress);
  const results = useMemo(() => computeResults(params, cureFactor, language), [params, cureFactor, language]);
  const projectedResults = useMemo(() => computeResults(params, getCureFraction(params, 1), language), [params, language]);
  const displayedResults: Results = stageIndex < 6 ? projectedResults : results;
  const currentTemp = stageIndex < 6 ? 25 : stageIndex === 6 ? temperatureAt(params, progress) : params.cureTemp;
  const curePercentage = stageIndex < 6 ? 0 : Math.round(getCureFraction(params, stageIndex === 6 ? progress : 1) * 100);

  function update<K extends keyof Parameters>(key: K, value: Parameters[K]) {
    setParams(old => ({ ...old, [key]: value }));
    setPreset('custom');
  }
  function addLog(message: (typeof eventLog)[number]) { setEventLog(old => [message, ...old].slice(0, 7)); }
  function selectPreset(key: string) {
    const found = PRESETS.find(item => item.key === key);
    const localized = presetDefs.find(item => item.key === key);
    if (!found) return;
    setParams({ ...DEFAULT_PARAMS, ...found.overrides });
    setPreset(key);
    setPlayhead(0);
    setPlaying(false);
    setViewMode('assembly');
    addLog({type:'preset',key});
  }
  function jump(index: number) {
    const i = clamp(index, 0, STAGES.length - 1);
    setPlayhead(elapsedStarts[i]);
    setPlaying(false);
    if (i <= 5) setViewMode('assembly');
  }
  function reset() {
    setPlayhead(0);
    setPlaying(false);
    setViewMode('assembly');
    addLog({type:'reset'});
  }

  useEffect(() => {
    if (!playing) { lastTick.current = null; return; }
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = lastTick.current === null ? 0 : Math.min(.12, (now - lastTick.current) / 1000);
      lastTick.current = now;
      setPlayhead(prev => Math.min(totalDuration, prev + delta * speed));
    }, 33);
    return () => { window.clearInterval(timer); lastTick.current = null; };
  }, [playing, speed]);

  useEffect(() => {
    if (completed && playing) setPlaying(false);
  }, [completed, playing]);


  useEffect(() => {
    if (stageIndex !== lastIndex.current) {
      lastIndex.current = stageIndex;
      setEventLog(old => [{type:'stage' as const,index:stageIndex}, ...old].slice(0, 7));
    }
  }, [stageIndex]);

  const statusClass = displayedResults.status.toLowerCase();
  const statusIcon = displayedResults.status === 'PASS' ? <CheckCircle2 size={17}/> : <XCircle size={17}/>;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-group"><div className="brand-symbol"><Cpu size={22}/></div>
        <div><div className="brand-title">DAF BONDING <span>LAB</span></div><div className="brand-subtitle">{t.brandSubtitle}</div></div>
      </div>
      <div className="topbar-middle"><span className="live-pill"><span/> {t.simOnline}</span><span className="divider-dot">/</span><span>{t.pasteType}</span></div>
      <div className="topbar-right"><div className="lang-switch" role="group" aria-label={t.languageLabel}>
        {([{ code: 'en', name: 'English' }, { code: 'id', name: 'Bahasa Indonesia' }, { code: 'zhTW', name: '繁體中文（台灣）' }] as const).map(({ code, name }) =>
          <button key={code} type="button" className={language === code ? 'active' : ''} aria-pressed={language === code} aria-label={name} title={name} onClick={() => setLanguage(code)}><LanguageFlag language={code}/></button>
        )}
      </div><span className="model-pill"><Activity size={14}/> {t.educationalModel}</span></div>
    </header>

    <main className="workspace">
      <aside className="left-panel">
        <div className="aside-top"><span className="eyebrow">{t.workflow}</span><h2>{t.bondingProcess}</h2><p>{t.conventionalFaceUp}</p></div>
        <nav className="stage-list" aria-label={t.processStages}>
          {STAGES.map((step, i) => <button type="button" key={step.id} className={`stage-item ${i === stageIndex ? 'active' : ''} ${i < stageIndex ? 'finished' : ''}`} onClick={() => jump(i)}>
            <span className="stage-line" />
            <span className="stage-icon">{i < stageIndex ? <Check size={15}/> : iconForStage(i)}</span>
            <span className="stage-content"><span className="stage-num">{t.step} {String(i + 1).padStart(2, '0')}</span><strong>{stageDefs[i].short}</strong></span>
            {i === stageIndex && <span className="stage-active-dot" />}
          </button>)}
        </nav>
        <div className="aside-separator" />
        <div className="preset-section"><div className="section-title"><WandSparkles size={15}/> {t.processScenarios}</div>
          <div className="preset-list">{presetDefs.map(s => <button key={s.key} type="button" title={s.description} className={`preset-button ${preset === s.key ? 'selected' : ''}`} onClick={() => selectPreset(s.key)}><span className={`preset-dot ${s.key}`}/><span>{s.name}</span>{preset === s.key && <Check size={13}/>}</button>)}</div>
        </div>
        <div className="aside-notice"><CircleHelp size={18}/><span>{t.asideNotice}</span></div>
      </aside>

      <section className="center-column">
        <div className="viewport-panel">
          <div className="viewport-top">
            <div className="viewport-title"><span className="viewport-title-dot"/><div><span className="eyebrow">{t.liveProcessView}</span><h1>{stage.name}</h1></div></div>
            <div className="camera-select"><button aria-label={t.isoTitle} title={t.isoTitle} className={cameraPreset === 'iso' ? 'current' : ''} onClick={() => { setCameraPreset('iso'); setViewMode('assembly'); }}>{t.iso}</button><button title={t.topTitle} className={cameraPreset === 'top' ? 'current' : ''} onClick={() => { setCameraPreset('top'); setViewMode('assembly'); }}>{t.top}</button><button title={t.frontTitle} className={cameraPreset === 'front' ? 'current' : ''} onClick={() => { setCameraPreset('front'); setViewMode('assembly'); }}>{t.front}</button><button title={t.sideTitle} className={cameraPreset === 'side' ? 'current' : ''} onClick={() => { setCameraPreset('side'); setViewMode('assembly'); }}>{t.side}</button></div>
          </div>
          <div className="viewport-stage"><SimulationScene params={params} results={displayedResults} stage={stage.id as Stage} progress={progress} viewMode={viewMode} cameraPreset={cameraPreset} showLabels={showLabels} sceneLabels={sceneLabels}/>
            <div className="viewport-overlay-left"><div className="floating-stat"><div className="floating-label">{t.currentStep}</div><strong>{String(stageIndex + 1).padStart(2, '0')} <span>/ 08</span></strong></div><div className="floating-stat"><div className="floating-label">{t.stepProgress}</div><strong>{Math.round(progress * 100)}<span> %</span></strong></div></div>
            <div className="viewport-overlay-right"><span className="dimension-chip">{t.die} {formatNumber(params.dieWidth)} × {formatNumber(params.dieHeight)} mm</span><span className="dimension-chip">{params.substrate === 'leadframe' ? t.cuLeadframe : t.laminate}</span></div>
            {stageIndex === 7 && <div className={`viewport-verdict ${statusClass}`} aria-live="polite">
              {statusIcon}<span><strong>{displayedResults.status}</strong><small>{displayedResults.issues.length === 0 ? t.allChecksSatisfied : t.failedChecks(displayedResults.issues.length)}</small>{displayedResults.issues.length>0&&<small>{displayedResults.issues.map(i=>i.title).join(' · ')}</small>}</span>
            </div>}
            {viewMode === 'cross' && <div className="cross-caption"><span>{t.sectionView}</span><b>{t.bltApprox} {formatNumber(displayedResults.blt)} µm</b><small>{t.crossNote}</small></div>}
          </div>
          <div className="film-legend">{t.filmLegend}{stageIndex===7&&<span> · {t.nextBackend}</span>}</div><div className="viewport-bottom"><div className="view-buttons"><button className={viewMode === 'assembly' ? 'selected' : ''} onClick={() => setViewMode('assembly')}><Layers size={15}/> {t.assembly}</button><button className={viewMode === 'transparent' ? 'selected' : ''} onClick={() => setViewMode('transparent')}><Eye size={15}/> {t.transparent}</button><button disabled={stageIndex < 5 || (stageIndex === 5 && progress < .88)} title={stageIndex < 5 ? t.crossSectionDisabled : t.inspectBonded} className={viewMode === 'cross' ? 'selected' : ''} onClick={() => setViewMode('cross')}><ScanLine size={15}/> {t.crossSection}</button></div><button title={showLabels?t.hideLabels:t.showLabels} className="label-toggle" onClick={() => setShowLabels(!showLabels)}><Eye size={14}/> {showLabels ? t.hideLabels : t.showLabels} {t.labels}</button></div>
        </div>

        <div className="playback-panel">
          <div className="playback-bar-top"><span><b>{t.processTimeline}</b><small>{t.step} {String(stageIndex + 1).padStart(2, '0')} / 08 · {stage.short.toUpperCase()}</small></span><span className="timer-text"><Clock3 size={14}/> {formatNumber(playhead, 1)}s / {formatNumber(totalDuration, 1)}s <span>{t.simTime}</span></span></div>
          <input className="timeline-range" aria-label={t.processTimeline} type="range" min="0" max={totalDuration} step="0.01" value={playhead} onChange={e => { const t = Number(e.target.value); setPlayhead(t); setPlaying(false); if (t < elapsedStarts[5]+durations[5]*.88) setViewMode('assembly'); }} style={{ '--percent': `${playhead / totalDuration * 100}%` } as React.CSSProperties}/>
          <div className="timeline-markers">{stageDefs.map((s, i) => <button key={s.id} className={stageIndex === i ? 'current' : ''} onClick={() => jump(i)}>{s.short}</button>)}</div>
          <div className="player-controls"><div className="player-group"><button className="icon-button" title={t.previousStage} aria-label={t.previousStage} onClick={() => jump(stageIndex - 1)} disabled={stageIndex === 0 && progress === 0}><SkipBack size={17}/></button><button className="icon-button" title={t.reset} aria-label={t.reset} onClick={reset}><RotateCcw size={17}/></button><button className="play-btn" onClick={() => { if (completed) {setPlayhead(0);setViewMode('assembly');} setPlaying(!playing || completed); }}>{playing ? <Pause size={17} fill="currentColor"/> : <Play size={17} fill="currentColor"/>}{playing ? t.pauseSimulation : completed ? t.replaySimulation : t.runSimulation}</button><button className="icon-button" title={t.nextStage} aria-label={t.nextStage} onClick={() => jump(stageIndex + 1)} disabled={stageIndex === 7}><SkipForward size={17}/></button></div><div className="speed-control"><span>{t.speed}</span>{[.5, 1, 2, 4].map(n => <button key={n} className={speed === n ? 'current' : ''} onClick={() => setSpeed(n)}>{n}×</button>)}</div></div>
        </div>

        <div className="detail-tools" onKeyDown={e => { if (e.key === 'Escape') setDetailPanel(null); }}>
          <div className="detail-toolbar" aria-label={t.engineeringExplanation}>
            <button type="button" aria-expanded={detailPanel === 'engineering'} aria-controls="engineering-details" className={detailPanel === 'engineering' ? 'active' : ''} onClick={() => setDetailPanel(old => old === 'engineering' ? null : 'engineering')}><CircleHelp size={14}/> {t.engineeringExplanation} <ChevronDown size={13} className="detail-chevron"/></button>
            <button type="button" aria-expanded={detailPanel === 'events'} aria-controls="event-details" className={detailPanel === 'events' ? 'active' : ''} onClick={() => setDetailPanel(old => old === 'events' ? null : 'events')}><Activity size={14}/> {t.eventMonitor} <span className="detail-count">{eventLog.length}</span><ChevronDown size={13} className="detail-chevron"/></button>
          </div>
          {detailPanel === 'engineering' && <div className="detail-drawer" id="engineering-details"><article className="info-panel"><div className="info-heading"><span className="eyebrow">{t.engineeringExplanation.toUpperCase()}</span><span className="info-step">0{stageIndex + 1}</span></div><h3>{stage.name}</h3><p>{stage.explanation}</p><div className="info-line"><CheckCircle2 size={16}/><span>{stage.purpose}</span></div><div className="info-line caution"><AlertTriangle size={16}/><span>{stage.issue}</span></div><div className="equipment-tag"><Settings2 size={13}/> {stage.device}</div></article></div>}
          {detailPanel === 'events' && <div className="detail-drawer" id="event-details"><article className="log-panel"><div className="info-heading"><span className="eyebrow">{t.eventMonitor.toUpperCase()}</span><span className="log-running"><span/> {playing ? t.running : t.ready}</span></div><h3>{t.systemLog}</h3><div className="log-lines">{eventLog.map((s, i) => <div className="log-entry" key={i}><span>{i === 0 ? '›' : '·'}</span>{s.type==='init'?t.logInit:s.type==='reset'?t.logProcessReset:s.type==='preset'?t.logPresetLoaded(presetDefs.find(p=>p.key===s.key)?.name||''):t.logStage((s.index??0)+1,stageDefs[s.index??0].name)}</div>)}</div></article></div>}
        </div>
      </section>

      <aside className="right-panel"><div className="settings-head"><div><div className="eyebrow">{t.equipmentConfiguration}</div><h2>{t.processControls}</h2></div><SlidersHorizontal size={19}/></div>
        <div className="tabs"><button className={panelTab === 'process' ? 'active' : ''} onClick={() => setPanelTab('process')}>{t.process}</button><button className={panelTab === 'material' ? 'active' : ''} onClick={() => setPanelTab('material')}>{t.materialAndCure}</button></div>
        <div className="settings-scroll">
          {panelTab === 'process' ? <div className="input-stack">
            <div className="settings-section-label"><Layers size={14}/> {t.dieAndSubstrate}</div>
            <div className="double-controls"><RangeField label={t.dieWidth} value={params.dieWidth} onChange={v => update('dieWidth', v)} min={2} max={7} step={.25} unit="mm"/><RangeField label={t.dieLength} value={params.dieHeight} onChange={v => update('dieHeight', v)} min={2} max={7} step={.25} unit="mm"/></div>
            <SelectField label={t.substrateType} value={params.substrate} onChange={v => update('substrate', v)} options={[{ value: 'leadframe', label: t.copperLeadframe }, { value: 'laminate', label: t.organicLaminate }]}/>
<RangeField label={t.waferThickness} value={params.waferThickness} onChange={v => update('waferThickness', v)} min={40} max={300} step={10} unit="µm"/><div className="settings-divider"/><div className="settings-section-label"><Layers size={14}/> {t.dispensing}</div><RangeField label={t.epoxyVolume} value={params.filmThickness} onChange={v => update('filmThickness', v)} min={10} max={80} step={5} unit="µm"/><RangeField label={t.nozzleGap} value={params.lamTemp} onChange={v => update('lamTemp', v)} min={30} max={110} step={5} unit="°C"/><RangeField label={t.lamPressure} value={params.lamPressure} onChange={v => update('lamPressure', v)} min={0.05} max={0.8} step={0.05} unit="MPa"/><RangeField label={t.dispenseImbalance} value={params.contamination} onChange={v => update('contamination', v)} min={0} max={100} step={5} unit="%"/><div className="settings-divider"/><div className="settings-section-label"><Crosshair size={14}/> {t.placement}</div><RangeField label={t.bondingForce} value={params.force} onChange={v => update('force', v)} min={0.5} max={7} step={0.1} unit="N"/><RangeField label={t.bondTemp} value={params.bondTemp} onChange={v => update('bondTemp', v)} min={50} max={180} step={5} unit="°C"/><RangeField label={t.dwell} value={params.dwell} onChange={v => update('dwell', v)} min={0.5} max={8} step={0.5} unit="s"/><RangeField label={t.xPlacementOffset} value={params.offsetX} onChange={v => update('offsetX', v)} min={-250} max={250} step={5} unit="µm"/><RangeField label={t.yPlacementOffset} value={params.offsetY} onChange={v => update('offsetY', v)} min={-250} max={250} step={5} unit="µm"/></div> : <div className="input-stack"><div className="settings-section-label"><Thermometer size={14}/> {t.curingRecipe}</div><RangeField label={t.cureTemperature} value={params.cureTemp} onChange={v => update('cureTemp', v)} min={100} max={220} step={5} unit="°C"/><RangeField label={t.cureDuration} value={params.cureTime} onChange={v => update('cureTime', v)} min={10} max={90} step={5} unit="min"/><div className="material-card"><CircleHelp size={17}/><p>{t.thermalNote}</p></div>
            <div className="settings-divider"/><div className="settings-section-label"><Gauge size={14}/> {t.liveCuringReadout}</div>
            <div className="live-readouts"><div><span>{t.chamberTemp}</span><strong>{currentTemp} °C</strong></div><div><span>{t.estimatedCure}</span><strong>{curePercentage}%</strong></div></div>
            <div className="cure-progress"><span style={{ width: `${curePercentage}%` }}/></div>
          </div>}
        </div>
        <div className="results-panel"><div className="results-heading"><div><span className="eyebrow">{t.modeledOutputs}</span><h2>{t.bondQuality}</h2></div><span className={`status-chip ${statusClass}`}>{statusIcon} {displayedResults.status}</span></div>
          <div className="metrics-grid"><Metric label={t.metricBLT} value={displayedResults.blt} unit="µm" detail={t.metricEstimatedFilmGap} severity={displayedResults.issues.some(x => x.code === 'compression') ? 'bad' : 'good'}/><Metric label={t.metricCoverage} value={displayedResults.coverage} unit="%" detail={t.metricEstimatedDieArea} severity={displayedResults.issues.some(x => x.code === 'coverage') ? 'bad' : 'good'}/><Metric label={t.metricFillet} value={displayedResults.compression} unit="%" detail={t.metricSqueezeOut} severity={displayedResults.issues.some(x => x.code === 'compression') ? 'bad' : 'good'}/><Metric label={t.metricPlacementError} value={displayedResults.placementError} unit="µm" detail={t.metricXYDeviation} severity={displayedResults.issues.some(x => x.code === 'placement') ? 'bad' : 'good'}/><Metric label={t.metricTilt} value={displayedResults.tilt} unit="°" detail={t.metricSimplifiedTilt} severity={displayedResults.issues.some(x => x.code === 'tilt') ? 'bad' : 'good'}/><Metric label={t.metricVoids} value={displayedResults.voids} unit="%" detail={t.metricHeuristicOnly} severity={displayedResults.issues.some(x => x.code === 'voids') ? 'bad' : 'good'}/></div>
          <div className="risk-row"><span>{t.bleedRisk}</span><strong className={displayedResults.damage.toLowerCase()}>{riskText(language, displayedResults.damage)}</strong><span>{t.delamination}</span><strong className={displayedResults.delamination.toLowerCase()}>{riskText(language, displayedResults.delamination)}</strong></div>
          <section className={`inspection-summary ${statusClass}`} aria-label={t.inspectionVerdict} aria-live="polite">
            <div className="inspection-summary-head">{statusIcon}<div><strong>{displayedResults.status === 'PASS' ? t.passSuccessful : t.failUnsuccessful}</strong><span>{displayedResults.issues.length === 0 ? t.passAllParams : t.failParamCount(displayedResults.issues.length)}</span></div></div>
            {displayedResults.issues.length > 0 ? <ul className="issue-list">{displayedResults.issues.map(issue => <li key={issue.code}><strong>{issue.title}</strong><span>{issue.detail}</span></li>)}</ul> : <p className="pass-detail">{t.passDetail}</p>}
          </section>
          <div className="disclaimer">{stageIndex < 6 ? t.projectedAfterFullCure : stageIndex === 6 ? t.cureInProgress : ''}{t.disclaimer}</div>
        </div>
      </aside>
    </main>
    <footer className="app-footer"><span><Zap size={12}/> DAF DIE ATTACH LAB</span><span>{t.footerProcess}</span><span>{t.footerModel}</span></footer>
  </div>;
}
