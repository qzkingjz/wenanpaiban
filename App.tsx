
import React, { useState } from 'react';
import { generateGQLayout, generateGQImage } from './services/geminiService';
import { AppState } from './types';
import { Loader2, ChevronLeft, Download, Sparkles, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const constructFullPage = (content: string) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background: #000; color: #fff; font-family: 'Inter', sans-serif; overflow-x: hidden; }
    .content { max-width: 700px; margin: 0 auto; padding: 80px 30px; }
    h1 { font-family: 'Noto Serif SC', serif; font-size: 56px; line-height: 1.1; margin-bottom: 50px; }
    p { font-size: 18px; line-height: 1.8; margin-bottom: 25px; color: #ccc; text-align: justify; }
    blockquote { font-family: 'Noto Serif SC', serif; font-size: 24px; border-left: 3px solid #fff; padding: 20px 30px; margin: 50px 0; background: #0a0a0a; }
    .visual { margin: 50px 0; }
    .visual img { width: 100%; height: auto; filter: contrast(1.1); }
    .caption { font-size: 10px; opacity: 0.3; text-transform: uppercase; text-align: right; margin-top: 10px; letter-spacing: 2px; }
  </style>
</head>
<body><div class="content">${content}</div></body>
</html>
  `;

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setErrorMessage('');
    try {
      setAppState(AppState.GENERATING_TEXT);
      setLoadingStep('正在解析版面秩序...');
      const rawHtml = await generateGQLayout(inputText);
      
      setAppState(AppState.GENERATING_IMAGES);
      const imageRegex = /<!--\s*\[IMAGE:\s*(.*?),\s*(.*?)\]\s*-->/gs;
      let finalHtml = rawHtml;
      const matches = [...rawHtml.matchAll(imageRegex)];

      for (let i = 0; i < matches.length; i++) {
        setLoadingStep(`正在渲染视觉大片 (${i + 1}/${matches.length})...`);
        const [fullComment, description] = matches[i];
        const imageUrl = await generateGQImage(description);
        if (imageUrl) {
          const imgHtml = `<div class="visual"><img src="${imageUrl}" /><div class="caption">GQ VISUAL // ${description.substring(0, 20)}</div></div>`;
          finalHtml = finalHtml.replace(fullComment, imgHtml);
        } else {
          finalHtml = finalHtml.replace(fullComment, '');
        }
      }
      setGeneratedHtml(finalHtml);
      setAppState(AppState.COMPLETED);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || '发生未知错误');
      setAppState(AppState.ERROR);
    }
  };

  const downloadFile = () => {
    const blob = new Blob([constructFullPage(generatedHtml)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GQ_Layout_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/5 px-8 flex justify-between items-center shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white text-black font-black text-xs px-2 py-0.5 italic">GQ</div>
          <span className="text-[10px] tracking-[0.4em] opacity-30 uppercase font-light">Aesthetic Studio</span>
        </div>
        {appState === AppState.COMPLETED && (
          <button onClick={() => setAppState(AppState.IDLE)} className="text-[10px] tracking-widest uppercase opacity-40 hover:opacity-100 flex items-center gap-2">
            <ChevronLeft size={12} /> 返回编辑
          </button>
        )}
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {appState === AppState.IDLE && (
          <div className="max-w-3xl mx-auto w-full px-8 py-20 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-5xl font-serif font-bold tracking-tight mb-8">格调重构</h2>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="粘贴您的文案内容..."
              className="w-full h-64 bg-white/5 border border-white/10 p-6 text-lg font-light focus:outline-none focus:border-white/20 transition-all resize-none mb-6"
            />
            <button
              onClick={handleGenerate}
              className="w-full bg-white text-black py-4 font-black tracking-[0.3em] uppercase text-xs hover:bg-neutral-200 transition-all"
            >
              启动渲染
            </button>
          </div>
        )}

        {(appState === AppState.GENERATING_TEXT || appState === AppState.GENERATING_IMAGES) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[#050505]">
            <Loader2 className="animate-spin opacity-20" size={40} />
            <p className="text-[10px] tracking-[0.5em] uppercase text-white/50">{loadingStep}</p>
          </div>
        )}

        {appState === AppState.COMPLETED && (
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 relative bg-black">
              {/* 使用 fixed 绝对定位填满内容区，防止任何压缩 */}
              <iframe 
                title="GQ Preview"
                className="w-full h-full border-none"
                srcDoc={constructFullPage(generatedHtml)}
              />
            </div>
            <div className="h-24 flex items-center justify-center border-t border-white/5 bg-[#050505] shrink-0">
              <button onClick={downloadFile} className="bg-white text-black px-12 py-3 text-[10px] font-bold tracking-[0.4em] uppercase shadow-2xl">
                获取离线版面 <Download size={14} className="inline ml-2"/>
              </button>
            </div>
          </div>
        )}

        {appState === AppState.ERROR && (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-4 bg-[#050505]">
             <AlertCircle className="text-red-500/50 mb-2" size={32} />
             <h3 className="text-serif text-xl">渲染中断</h3>
             <code className="text-[10px] bg-white/5 p-4 rounded max-w-md break-all opacity-60">
               {errorMessage}
             </code>
             <p className="text-xs opacity-30 max-w-xs leading-relaxed mt-4">
               如果是 401/403 错误，请检查 Vercel 环境变量中是否正确配置了 API_KEY。
             </p>
             <button onClick={() => setAppState(AppState.IDLE)} className="mt-4 text-[10px] tracking-widest uppercase underline opacity-50 hover:opacity-100">返回重试</button>
           </div>
        )}
      </main>

      <footer className="h-12 border-t border-white/5 px-8 flex justify-between items-center shrink-0">
        <span className="text-[8px] tracking-[0.5em] opacity-10 uppercase">GQ Studio // Build 105</span>
        <span className="text-[8px] tracking-[0.5em] opacity-10 uppercase">Vercel Environment Verified</span>
      </footer>
    </div>
  );
};

export default App;
