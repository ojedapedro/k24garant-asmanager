import React, { useState } from 'react';
import { askDataQuestion } from '../services/geminiService';
import { WarrantyRecord } from '../types';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: WarrantyRecord[];
}

const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, records }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const result = await askDataQuestion(records, question);
      setAnswer(result);
    } catch (error) {
        setAnswer("Hubo un error al procesar tu pregunta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center">
          <h3 className="text-white font-bold flex items-center gap-2">
            <i className="fas fa-sparkles"></i> Asistente K24 AI
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {answer && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4 text-gray-800 text-sm border border-blue-100 animate-fade-in">
              <p className="font-semibold text-blue-700 mb-1">Respuesta:</p>
              {answer}
            </div>
          )}
          
          {!answer && !loading && (
             <div className="text-center text-gray-400 py-8">
                <i className="fas fa-comment-dots text-4xl mb-2 opacity-30"></i>
                <p>Pregunta sobre los datos filtrados...</p>
                <p className="text-xs mt-2">Ej: "¿Cuál es la falla más común en Samsung?"</p>
             </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
                <i className="fas fa-circle-notch fa-spin text-blue-500 text-2xl"></i>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              onClick={handleAsk}
              disabled={loading || !question}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModal;