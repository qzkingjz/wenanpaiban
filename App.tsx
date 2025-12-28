
import React, { useState } from 'react';
import { generateGQLayout, generateGQImage } from './services/geminiService';
import { AppState } from './types';
import { Loader2, Send, ChevronLeft, Download, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState('');
  
  // 构造完整的 HTML 模板，确保排版不被压缩且具有杂志感
  const constructFullPage = (content: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    html, body { 
      margin: 0; 
      padding: 0; 
      background-color: #000; 
      color: #fff; 
      font-family: 'Inter', -apple-system, sans-serif; 
      height: 100%;
      width: 100%;
      overflow-x: hidden;
    }
    .gq-article-content { 
      width: 100%; 
      max-width: 760px; 
      margin: 0 auto; 
      padding: 80px 40px 120px; 
      box-sizing: border-box; 
      animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1);
    }
    h1 { 
      font-family: 'Noto Serif SC', serif; 
      font-size: clamp(34px, 8vw, 72px); 
      line-height: 1.1; 
      font-weight: 700; 
      text-transform: uppercase; 
      margin: 0 0 60px 0; 
      letter-spacing: -0.04em; 
      color: #fff; 
    }
    h2 { 
      font-family: 'Noto Serif SC', serif; 
      font-size: 20px; 
      margin: 60px 0 25px; 
      border-top: 1px solid #333; 
      padding-top: 25px; 
      text-transform: uppercase; 
      letter-spacing: 0.15em; 
      color: #888; 
    }
    p { 
      font-size: 17px; 
      line-height: 1.9; 
      margin-bottom: 28px; 
      color: #ccc; 
      font-weight: 300; 
      text-align: justify; 
    }
    blockquote { 
      font-family: 'Noto Serif SC', serif; 
      font-size: 24px; 
      font-style: italic; 
      margin: 60px 0; 
      padding: 30px 40px; 
      background: #080808; 
      border-left: 2px solid #fff; 
      line-height: 1.6; 
      color: #fff; 
    }
    .gq-visual-frame { 
      margin: 60px 0; 
      background: #000; 
      overflow: hidden;
    }
    .gq-visual-frame img { 
      width: 100%; 
      height: auto; 
      display: block; 
      filter: contrast(1.05) brightness(0.9);
    }
    .gq-caption { 
      font-size: 9px; 
      text-transform: uppercase; 
      letter-spacing: 0.25em; 
      color: #444; 
      margin-top: 12px; 
      text-align: right; 
    }
    @media (max-width: 640px) { 
      .gq-article-content { padding: 40px 20px 80px; } 
      h1 { font-size: 32px; } 
    }
  </style>
</head>
<body>
  <article class="gq-article-content">
    ${content}
  </article>
</body>
</html>
  `;

  const handleGenerate = async () => {
    if (!inputText.trim()) return;

    try {
      setAppState(AppState.GENERATING_TEXT);
      setLoadingStep('正在解析版面秩序...');
      const rawHtml = await generateGQLayout(inputText);
      
      setAppState(AppState.GENERATING_IMAGES);
      const imageRegex = /<!--\s*\[IMAGE:\s*(.*?),\s*(.*?)\]\s*-->/gs;
      let finalHtml = rawHtml;
      const matches = [...rawHtml.matchAll(imageRegex)];

      for (let i = 0; i < matches.length; i++) {
        setLoadingStep(`正在捕捉视觉瞬间 (${i + 1}/${matches.length})...`);
        const [fullComment, description] = matches[i];
        const imageUrl = await generateGQImage(description);
        
        if (imageUrl) {
          const imgHtml = `
            <figure class="gq-visual-frame">
              <img src="${imageUrl}" alt="GQ Aesthetic Visual" />
              <figcaption class="gq-caption">Visual Anchor // ${description.substring(0, 35)}...</figcaption>
            </figure>
          `;
          finalHtml = finalHtml.replace(fullComment, imgHtml);
        } else {
          finalHtml = finalHtml.replace(fullComment, '');
        }
      }

      setGeneratedHtml(finalHtml);
      setAppState(AppState.COMPLETED);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
    }
  };

  const downloadFile = () => {
    if (!generatedHtml) return;
    const fullHtml = constructFullPage(generatedHtml);
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GQ_Editorial_Final_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setGeneratedHtml('');
    setInputText('');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Editorial Header */}
      <header className="border-b border-white/5 px-8 py-5 flex justify-between items-center bg-[#050505] shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="bg-white text-black font-black text-sm px-3 py-1 tracking-tighter italic">GQ</div>
          <div className="h-4 w-[1px] bg-white/20"></div>
          <h1 className="text-[10px] tracking-[0.4em] font-light uppercase opacity-40">Aesthetic Studio</h1>
        </div>
        {appState === AppState.COMPLETED && (
          <button onClick={reset} className="text-[10px] tracking-widest uppercase opacity-40 hover:opacity-100 transition-all flex items-center gap-2">
            <ChevronLeft size={12} /> 重新编辑
          </button>
        )}
      </header>

      <main className="flex-1 relative min-h-0 w-full overflow-hidden">
        {appState === AppState.IDLE && (
          <div className="max-w-4xl mx-auto w-full h-full overflow-y-auto px-8 py-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-10">
              <h2 className="text-6xl font-serif font-bold tracking-tighter leading-none mb-4">内容入场<br/><span className="text-white/20">格调自成</span></h2>
              <p className="text-white/30 font-light max-w-md leading-relaxed text-sm">
                输入您的文案，我们将基于 GQ 视觉圣经，为您构建一个充满先锋摄影与留白艺术的数字版面。
              </p>
            </div>

            <div className="space-y-6">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="粘贴您的文章、访谈或品牌故事..."
                className="w-full h-64 bg-neutral-900/30 border border-white/5 p-6 text-lg font-light focus:outline-none focus:border-white/20 transition-all resize-none placeholder:text-neutral-800"
              />
              <button
                onClick={handleGenerate}
                disabled={!inputText.trim()}
                className="w-full bg-white text-black py-4 font-black tracking-[0.3em] uppercase text-xs hover:bg-neutral-200 transition-all disabled:opacity-10 shadow-lg"
              >
                启动渲染程序
              </button>
            </div>
          </div>
        )}

        {(appState === AppState.GENERATING_TEXT || appState === AppState.GENERATING_IMAGES) && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-8 bg-[#050505]">
            <div className="relative">
              <Loader2 className="animate-spin text-white/10" size={56} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={16} className="text-white animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs tracking-[0.6em] font-light uppercase text-white/60">{loadingStep}</p>
              <div className="text-[9px] tracking-[0.2em] uppercase opacity-20">Style is the only constant</div>
            </div>
          </div>
        )}

        {appState === AppState.COMPLETED && (
          <div className="w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-1000">
            <div className="flex-1 relative bg-black min-h-0 w-full">
              <iframe 
                title="GQ Preview"
                className="absolute top-0 left-0 w-full h-full border-none block"
                srcDoc={constructFullPage(generatedHtml)}
              />
            </div>
            <div className="p-6 bg-[#050505] border-t border-white/5 flex justify-center shrink-0">
              <button 
                onClick={downloadFile}
                className="flex items-center gap-3 px-12 py-4 bg-white text-black text-[10px] font-bold tracking-[0.4em] uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                下载成品页面 <Download size={14}/>
              </button>
            </div>
          </div>
        )}

        {appState === AppState.ERROR && (
           <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#050505]">
             <p className="text-neutral-500 font-serif">渲染异常</p>
             <button onClick={reset} className="text-[10px] tracking-widest uppercase underline opacity-50 hover:opacity-100 transition-all">重试</button>
           </div>
        )}
      </main>

      <footer className="p-5 flex justify-between items-center bg-black border-t border-white/5 shrink-0 z-10">
        <div className="text-[8px] tracking-[0.5em] font-bold uppercase opacity-10">GQ Aesthetic Studio // v1.0.4</div>
        <div className="text-[8px] tracking-[0.5em] font-bold uppercase opacity-10">Design as Order</div>
      </footer>
    </div>
  );
};

export default App;
