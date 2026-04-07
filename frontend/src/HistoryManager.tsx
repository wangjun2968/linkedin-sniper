import React, { useState, useEffect } from 'react';
import { History, Trash2, Clock, CheckCircle2 } from 'lucide-react';

interface HistoryRecord {
  id: number;
  user_email: string;
  style: string;
  result: any;
  created_at: number;
}

interface HistoryManagerProps {
  currentStyle: string;
  onSelectHistory: (content: any) => void;
  token?: string;
}

const HistoryManager: React.FC<HistoryManagerProps> = ({ currentStyle, onSelectHistory, token }) => {
  const [histories, setHistories] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 这里的 API 地址根据后端实际部署调整
      const response = await fetch('https://linkedin-api.wangjun2968.workers.dev/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setHistories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Fetch history failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchHistory();
  }, [token]);

  if (!token) return (
    <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500 border border-dashed border-gray-300">
      登录后即可查看历史保存的版本
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          历史版本库 (D1)
        </h3>
        <button onClick={fetchHistory} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">刷新</button>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">同步中...</div>
        ) : histories.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">暂无历史记录</div>
        ) : (
          histories.map((h) => (
            <div 
              key={h.id} 
              onClick={() => onSelectHistory(JSON.parse(h.result))}
              className="p-3 hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 px-1.5 py-0.5 bg-indigo-50 rounded">
                  {h.style}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(h.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 pr-4">
                {JSON.parse(h.result).headlines?.[0] || '无标题版本'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryManager;
