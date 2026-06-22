import React, { useState, useEffect } from 'react';
import './App.css';

// رابط الباك إند
const API_URL = "https://ar-app-backend-production-3c06.up.railway.app";

function App() {
  const [targets, setTargets] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const res = await fetch(`${API_URL}/api/targets`);
      const data = await res.json();
      setTargets(data);
    } catch (err) {
      console.error(err);
      setStatus('خطأ في الاتصال بالخادم!');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الهدف؟')) return;
    try {
      setStatus('جاري الحذف...');
      await fetch(`${API_URL}/api/targets/${id}`, { method: 'DELETE' });
      await fetchTargets();
      
      const res = await fetch(`${API_URL}/api/targets`);
      const updatedTargets = await res.json();
      await compileAndUploadMindFile(updatedTargets);
      
      setStatus('تم الحذف بنجاح!');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setStatus('حدث خطأ أثناء الحذف.');
    }
  };

  const handleUpload = async () => {
    if (!imageFile || !modelFile || !name) {
      setStatus('الرجاء اختيار الصورة والملف (فيديو أو مجسم) وكتابة الاسم!');
      return;
    }

    setIsProcessing(true);
    setStatus('جاري رفع الملفات إلى الخادم...');

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('model', modelFile);
      formData.append('name', name);

      const res = await fetch(`${API_URL}/api/targets`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('فشل الرفع (تأكد من صيغة الملفات)');

      setStatus('تم الرفع! جاري تحديث بيانات الذكاء الاصطناعي...');
      const targetsRes = await fetch(`${API_URL}/api/targets`);
      const allTargets = await targetsRes.json();
      setTargets(allTargets);

      await compileAndUploadMindFile(allTargets);

      setImageFile(null);
      setModelFile(null);
      setName('');
      document.getElementById('imageInput').value = '';
      document.getElementById('modelInput').value = '';

    } catch (err) {
      console.error(err);
      setStatus(`❌ فشل: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const compileAndUploadMindFile = async (allTargets) => {
    try {
      setStatus('جاري دمج الصور وتكوين ملف السحابة...');

      const imageElements = [];
      for (const target of allTargets) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`فشل تحميل الصورة: ${target.imageUrl}`));
          img.src = `${API_URL}${target.imageUrl}`;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 800; 
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const resizedImg = new Image();
        await new Promise((resolve) => {
           resizedImg.onload = resolve;
           resizedImg.src = canvas.toDataURL('image/jpeg', 0.8);
        });

        imageElements.push(resizedImg);
      }

      if (imageElements.length === 0) return;

      const compiler = new window.MINDARObject.Compiler();
      
      await new Promise(r => setTimeout(r, 100));

      await compiler.compileImageTargets(imageElements, (progress) => {
        setStatus(`جاري تحليل الذكاء الاصطناعي: ${Math.round(progress)}%`);
      });

      const exportedBuffer = await compiler.exportData();
      const mindBlob = new Blob([exportedBuffer], { type: 'application/octet-stream' });
      const mindFile = new File([mindBlob], 'targets.mind', { type: 'application/octet-stream' });

      setStatus('جاري تحديث السحابة...');

      const uploadMindData = new FormData();
      uploadMindData.append('mindFile', mindFile);

      const uploadMindRes = await fetch(`${API_URL}/api/compile`, {
        method: 'POST',
        body: uploadMindData
      });

      if (!uploadMindRes.ok) throw new Error('فشل رفع ملف السحابة');

      setStatus('✅ اكتملت العملية بنجاح! التطبيق جاهز للاستخدام.');
      setTimeout(() => setStatus(''), 5000);
      
    } catch (err) {
      console.error(err);
      setStatus(`❌ فشل في التجميع: ${err.message}.`);
    }
  };

  return (
    <div className="admin-container">
      <div className="header">
        <h1>Spotter <span>AR</span> Admin</h1>
        <p>مركز التحكم السحابي لإدارة تجارب الواقع المعزز</p>
      </div>

      {status && <div className="status-bar">{status}</div>}

      <div className="glass-card">
        <h2>إضافة ارتباط جديد للمنظومة</h2>
        
        <div className="input-group">
          <label>اسم الارتباط (للتنظيم فقط):</label>
          <input 
            type="text" 
            className="name-input"
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="مثال: غلاف شيكولاتة أو فيديو توضيحي"
            disabled={isProcessing}
          />
        </div>

        <div className="file-inputs-row">
          <div className="file-box">
            <label>صورة الهدف (.jpg, .png)</label>
            <input 
              id="imageInput" 
              type="file" 
              accept="image/*" 
              onChange={e => setImageFile(e.target.files[0])} 
              disabled={isProcessing}
            />
            <p>الصورة التي سيتم توجيه الكاميرا إليها</p>
          </div>

          <div className="file-box" style={{ borderColor: modelFile?.name.endsWith('.mp4') ? '#74c356' : '' }}>
            <label>الملف المعروض (.glb أو .mp4)</label>
            <input 
              id="modelInput" 
              type="file" 
              accept=".glb, video/mp4" 
              onChange={e => setModelFile(e.target.files[0])} 
              disabled={isProcessing}
            />
            <p>المجسم 3D أو فيديو MP4 الذي سيظهر فوق الصورة</p>
          </div>
        </div>

        <button 
          className="upload-btn"
          onClick={handleUpload} 
          disabled={isProcessing || !imageFile || !modelFile || !name}
        >
          <span>{isProcessing ? 'الرجاء الانتظار (يتم المعالجة)...' : 'رفع ودمج البيانات'}</span>
        </button>
      </div>

      <div className="glass-card">
        <h2>الأهداف المسجلة حالياً ({targets.length})</h2>
        <div className="targets-grid">
          {targets.map(target => (
            <div key={target.id} className="target-card">
              <div className="card-header">
                <span className="index-badge">فهرس: {target.index}</span>
                <span className={`badge ${target.mediaType === 'video' ? 'badge-video' : 'badge-3d'}`}>
                  {target.mediaType === 'video' ? '🎥 فيديو' : '📦 مجسم 3D'}
                </span>
                
                <img src={`${API_URL}${target.imageUrl}`} alt={target.name} className="card-image" />
              </div>
              <div className="card-body">
                <h3 className="card-title">{target.name}</h3>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(target.id)} 
                  disabled={isProcessing}
                >
                  حذف الهدف
                </button>
              </div>
            </div>
          ))}
          {targets.length === 0 && (
            <div className="empty-state">
              <p>لا توجد أهداف حالياً. أضف أول هدف لتبدأ المنظومة!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
