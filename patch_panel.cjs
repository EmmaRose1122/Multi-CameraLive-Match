const fs = require('fs');
const file = 'src/components/MasterSwitcher/ScoreboardOverlayPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetImport = `  EyeOff,
} from 'lucide-react';`;
const replaceImport = `  EyeOff,
  Type,
} from 'lucide-react';`;
content = content.replace(targetImport, replaceImport);

const targetDiv = `        </div>
      </div>
    </div>
  );
};`;
const replaceDiv = `        </div>
      </div>

      {/* Row 4: Interactive Lower Third Editor */}
      <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Type className="w-4 h-4 text-emerald-400" />
             <span className="text-xs font-bold text-white uppercase tracking-tight">Custom Lower Third Engine</span>
           </div>
           
           <button
             onClick={() => setScoreboard((p) => ({ ...p, showLowerThird: !p.showLowerThird }))}
             className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors \${
               scoreboard.showLowerThird
                 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                 : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white'
             }\`}
           >
             {scoreboard.showLowerThird ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
             <span>{scoreboard.showLowerThird ? 'Lower Third LIVE' : 'Lower Third OFF'}</span>
           </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
           <div className="flex-1 flex flex-col gap-1">
             <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Primary Title</label>
             <input
               type="text"
               value={scoreboard.customLowerThird?.title || ''}
               onChange={(e) => setScoreboard((p) => ({
                 ...p,
                 customLowerThird: { ...p.customLowerThird, title: e.target.value }
               }))}
               placeholder="e.g. JOHN SMITH"
               className="bg-black/30 border border-white/10 rounded px-2.5 py-1.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500/50 focus:bg-black/50 transition-colors"
             />
           </div>
           <div className="flex-1 flex flex-col gap-1">
             <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Secondary Subtitle</label>
             <input
               type="text"
               value={scoreboard.customLowerThird?.subtitle || ''}
               onChange={(e) => setScoreboard((p) => ({
                 ...p,
                 customLowerThird: { ...p.customLowerThird, subtitle: e.target.value }
               }))}
               placeholder="e.g. Lead Commentator"
               className="bg-black/30 border border-white/10 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:bg-black/50 transition-colors"
             />
           </div>
        </div>
      </div>
    </div>
  );
};`;
content = content.replace(targetDiv, replaceDiv);

fs.writeFileSync(file, content);
