import { useState } from 'react';
import { deleteSummary } from '../../api/ai';
import type { AISummary } from '../../api/ai';
import { Copy, Trash2, Download, Check, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';

export default function AISummaryCard({ summary, isDarkMode }: { summary: AISummary; isDarkMode: boolean }) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([summary.summary], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${summary.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this AI summary?')) {
      await deleteSummary(summary._id);
      queryClient.invalidateQueries({ queryKey: ['aiSummaries'] });
    }
  };

  const estReadTime = Math.max(1, Math.ceil(summary.originalWordCount / 200));

  return (
    <div className={`rounded-2xl border p-6 mb-6 shadow-sm hover:shadow-md transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-100 shadow-zinc-950/20' : 'bg-white border-zinc-100 text-zinc-850'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 transition-colors ${isDarkMode ? 'text-zinc-100' : 'text-cv-brown'}`}>
            <Sparkles className="w-5 h-5 text-cv-sage" />
            {summary.title}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {new Date(summary.createdAt).toLocaleString()} • {summary.summaryType.toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className={`p-2 rounded-xl text-zinc-400 transition-colors ${isDarkMode ? 'hover:bg-zinc-700 hover:text-white' : 'hover:bg-zinc-50 hover:text-cv-brown'}`}>
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={handleDownload} className={`p-2 rounded-xl text-zinc-400 transition-colors ${isDarkMode ? 'hover:bg-zinc-700 hover:text-white' : 'hover:bg-zinc-50 hover:text-cv-brown'}`}>
            <Download className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} className={`p-2 rounded-xl text-zinc-400 transition-colors ${isDarkMode ? 'hover:bg-red-500/20 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-500'}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className={`flex items-center gap-4 mb-4 text-xs font-medium px-3 py-1.5 rounded-lg w-fit ${isDarkMode ? 'text-cv-sage bg-cv-sage/10' : 'text-cv-olive bg-cv-sage/10'}`}>
        <span>{summary.originalWordCount} original words</span>
        <span>•</span>
        <span>~{estReadTime} min read</span>
        <span>•</span>
        <span>{summary.aiModel}</span>
      </div>

      <div className={`prose prose-sm max-w-none tiptap-editor-content ${isDarkMode ? 'prose-invert text-zinc-200' : 'prose-zinc text-zinc-700'}`}>
        <ReactMarkdown>{summary.summary}</ReactMarkdown>
      </div>
    </div>
  );
}
