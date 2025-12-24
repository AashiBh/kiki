import React, { useState, useRef } from 'react';
import { HeartFeatures, PredictionResult } from './types';
import { analyzeHeartHealth } from './services/geminiService';
import InputGroup from './components/InputGroup';
import ResultsDisplay from './components/ResultsDisplay';
import { Activity, Heart, Download, Database, Microscope, ShieldCheck, AlertCircle, Fingerprint, Layers, Info } from 'lucide-react';

const App: React.FC = () => {
  const [features, setFeatures] = useState<HeartFeatures>({
    age: 54, sex: 1, cp: 2, bp: 130, chol: 240,
    maxhr: 155, exang: 0, oldpeak: 1.2, ca: 0, thal: 3
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFeatures(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const processOrangeFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      // ORANGE DATASET LINKAGE POINT: THIS LINE IDENTIFIES AND MAPS DATA FROM UPLOADED ORANGE .TAB FILES
      const dataLine = lines.find(l => {
        const isHeader = l.startsWith('#') || l.includes('continuous') || l.includes('discrete') || l.includes('feature') || l.includes('meta') || l.includes('class') || l.toLowerCase().includes('age');
        return !isHeader && /^\d/.test(l);
      });

      if (dataLine) {
        const v = dataLine.split(/,|\t/).map(val => val.trim());
        if (v.length >= 10) {
          setFeatures({
            age: parseFloat(v[0]) || 50,
            sex: parseFloat(v[1]) === 1 ? 1 : 0,
            cp: parseFloat(v[2]) || 1,
            bp: parseFloat(v[3]) || 120,
            chol: parseFloat(v[4]) || 200,
            maxhr: parseFloat(v[5]) || 150,
            exang: parseFloat(v[6]) === 1 ? 1 : 0,
            oldpeak: parseFloat(v[7]) || 0,
            ca: parseFloat(v[8]) || 0,
            thal: parseFloat(v[9]) || 3
          });
          setError(null);
        } else {
          setError("Incomplete data row in file.");
        }
      } else {
        setError("Unsupported file format. Please use Orange .tab or CSV.");
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processOrangeFile(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processOrangeFile(e.dataTransfer.files[0]);
    }
  };

  const downloadOrangeTab = () => {
    const header = "age\tsex\tcp\tbp\tchol\tmaxhr\texang\toldpeak\tca\tthal\n";
    const types = "continuous\tdiscrete\tdiscrete\tcontinuous\tcontinuous\tcontinuous\tdiscrete\tcontinuous\tdiscrete\tdiscrete\n";
    const roles = "feature\tfeature\tfeature\tfeature\tfeature\tfeature\tfeature\tfeature\tfeature\tfeature\n";
    const values = `${features.age}\t${features.sex}\t${features.cp}\t${features.bp}\t${features.chol}\t${features.maxhr}\t${features.exang}\t${features.oldpeak}\t${features.ca}\t${features.thal}\n`;
    const blob = new Blob([header + types + roles + values], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orange_export.tab`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeHeartHealth(features);
      setResult(data);
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err: any) {
      setError("Analysis Failed. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      <header className="flex flex-col lg:flex-row items-center justify-between mb-12 gap-8 glass-card p-10 rounded-[3rem]">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 bg-blue-600 rounded-[1.75rem] flex items-center justify-center shadow-2xl animate-float">
              <Heart className="w-9 h-9 text-white fill-current opacity-90" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center">
               <ShieldCheck className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">CardiaGuard <span className="text-blue-600">Pro</span></h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
              <Database className="w-3 h-3 text-orange-400" /> Orange / UCI Diagnostic Suite
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={downloadOrangeTab}
            className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-[11px] font-black border border-slate-100 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-emerald-500" /> EXPORT ORANGE .TAB
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <aside className="xl:col-span-3 space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <Fingerprint className="w-24 h-24" />
            </div>
            <h4 className="text-xs font-black mb-4 uppercase tracking-[0.2em] text-blue-400">Orange Rule Engine</h4>
            <div className="space-y-4">
              <div className={`p-3 rounded-xl border transition-all ${features.ca >= 1 ? 'bg-red-500/20 border-red-500/50' : 'bg-white/5 border-white/10'}`}>
                <p className="text-[10px] font-bold text-blue-300 uppercase">CA Indicator</p>
                <p className="text-[11px] text-slate-300 mt-1">Value ≥ 1: High Pathological Weight {features.ca >= 1 && '⚠️'}</p>
              </div>
              <div className={`p-3 rounded-xl border transition-all ${features.oldpeak > 1.0 ? 'bg-red-500/20 border-red-500/50' : 'bg-white/5 border-white/10'}`}>
                <p className="text-[10px] font-bold text-orange-300 uppercase">ST Depression</p>
                <p className="text-[11px] text-slate-300 mt-1">Oldpeak > 1.0: High Risk Warning {features.oldpeak > 1.0 && '⚠️'}</p>
              </div>
              <div className={`p-3 rounded-xl border transition-all ${[6, 7].includes(features.thal) ? 'bg-red-500/20 border-red-500/50' : 'bg-white/5 border-white/10'}`}>
                <p className="text-[10px] font-bold text-emerald-300 uppercase">Thal Type</p>
                <p className="text-[11px] text-slate-300 mt-1">Type 6/7: Significant Predictor {[6, 7].includes(features.thal) && '⚠️'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Microscope className="w-4 h-4 text-blue-500" /> Statistical Weight
            </h4>
            <div className="space-y-4">
              {[
                { label: 'Hematology (Thal)', val: 95, color: 'bg-indigo-500' },
                { label: 'Angiography (CA)', val: 88, color: 'bg-blue-500' },
                { label: 'Exercise (Oldpeak)', val: 76, color: 'bg-orange-500' }
              ].map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>{item.label}</span>
                    <span>{item.val}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="xl:col-span-9 space-y-10">
          <section 
            className={`relative p-12 border-4 border-dashed rounded-[4rem] transition-all cursor-pointer flex flex-col items-center justify-center text-center
              ${dragActive ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-100 hover:border-blue-200'}
            `}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 text-blue-600">
              <Layers className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Upload Orange Dataset</h2>
            <p className="text-sm text-slate-400 mt-2 font-medium">Drop .tab / .csv file to autofill diagnostic parameters</p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".tab,.csv" onChange={handleFileUpload} />
          </section>

          <div className="bg-white rounded-[4rem] shadow-2xl p-10 md:p-16 border border-slate-50 relative">
            <form onSubmit={handleSubmit} className="space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                <div className="space-y-8 md:col-span-2 lg:col-span-3">
                   <div className="flex items-center gap-4">
                     <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 text-[11px] font-black flex items-center justify-center">01</span>
                     <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.3em] flex-1">Bio-Metric Profiling</h3>
                     <div className="h-px bg-slate-100 flex-[4]"></div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <InputGroup label="Patient Age" name="age" value={features.age} onChange={handleInputChange} min={1} max={120} />
                     <InputGroup label="Sex" name="sex" value={features.sex} onChange={handleInputChange} options={[{ label: 'Male', value: 1 }, { label: 'Female', value: 0 }]} />
                     <InputGroup label="Sys. BP (mmHg)" name="bp" value={features.bp} onChange={handleInputChange} min={80} max={220} />
                   </div>
                </div>

                <div className="space-y-8 md:col-span-2 lg:col-span-3">
                   <div className="flex items-center gap-4">
                     <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-black flex items-center justify-center">02</span>
                     <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.3em] flex-1">Clinical Data</h3>
                     <div className="h-px bg-slate-100 flex-[4]"></div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <InputGroup label="Cholesterol" name="chol" value={features.chol} onChange={handleInputChange} min={100} max={600} helperText="mg/dl units" />
                     <InputGroup label="Max Heart Rate" name="maxhr" value={features.maxhr} onChange={handleInputChange} min={60} max={220} />
                     <InputGroup label="Angina Indicator" name="exang" value={features.exang} onChange={handleInputChange} options={[{ label: 'Negative', value: 0 }, { label: 'Positive', value: 1 }]} />
                   </div>
                </div>

                <div className="space-y-8 md:col-span-2 lg:col-span-3">
                   <div className="flex items-center gap-4">
                     <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 text-[11px] font-black flex items-center justify-center">03</span>
                     <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.3em] flex-1">Orange Thresholds</h3>
                     <div className="h-px bg-slate-100 flex-[4]"></div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <InputGroup label={`CP Type (1-4) ${features.cp === 4 ? '⚠️' : ''}`} name="cp" value={features.cp} onChange={handleInputChange} options={[{ label: 'Typical', value: 1 }, { label: 'Atypical', value: 2 }, { label: 'Non-Anginal', value: 3 }, { label: 'Asymptomatic (4)', value: 4 }]} />
                      <InputGroup label={`Thal Marker ${[6, 7].includes(features.thal) ? '⚠️' : ''}`} name="thal" value={features.thal} onChange={handleInputChange} options={[{ label: 'Normal (3)', value: 3 }, { label: 'Fixed (6)', value: 6 }, { label: 'Reversable (7)', value: 7 }]} />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <InputGroup label={`Oldpeak (>1.0 Risk) ${features.oldpeak > 1.0 ? '⚠️' : ''}`} name="oldpeak" value={features.oldpeak} onChange={handleInputChange} step={0.1} />
                     <InputGroup label={`CA Vessels (≥1 Risk) ${features.ca >= 1 ? '⚠️' : ''}`} name="ca" value={features.ca} onChange={handleInputChange} min={0} max={3} />
                   </div>
                </div>
              </div>

              <div className="pt-10 flex flex-col items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className={`group relative px-20 py-8 rounded-[3rem] font-black text-xl tracking-tight transition-all active:scale-95 shadow-xl
                    ${loading ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-1'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    {loading ? (
                      <><div className="w-6 h-6 border-[3px] border-slate-200 border-t-blue-500 rounded-full animate-spin"></div><span>Analyzing...</span></>
                    ) : (
                      <><Activity className="w-7 h-7" /><span>Perform Diagnostics</span></>
                    )}
                  </div>
                </button>
                {error && (
                   <div className="mt-8 flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold text-xs">
                     <AlertCircle className="w-4 h-4" /> {error}
                   </div>
                )}
              </div>
            </form>

            <div id="results-section">
              {result && <ResultsDisplay result={result} />}
            </div>
          </div>
        </main>
      </div>
      
      <footer className="mt-20 space-y-6 pb-12">
        <div className="max-w-3xl mx-auto p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
          <Info className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
            <span className="font-black uppercase tracking-wider block mb-1 text-amber-900">Medical Disclaimer & Warning</span>
            CardiaGuard AI is an experimental analytical tool mirroring Orange Data Mining logic on the 1988 UCI Heart Disease dataset. AI models can produce inaccurate results or hallucinations. This system is for informational and educational purposes only and DOES NOT constitute medical advice, clinical diagnosis, or treatment recommendations. Always consult a qualified medical professional for heart health concerns.
          </p>
        </div>
        <div className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
          CardiaGuard Pro &copy; 2024 | Powered by UCI-Orange Logic
        </div>
      </footer>
    </div>
  );
};

export default App;
