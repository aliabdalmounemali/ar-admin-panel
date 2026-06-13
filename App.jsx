import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = "https://ar-app-backend-production-3c06.up.railway.app";

function App() {
  const [targets, setTargets] = useState([]);
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/targets`);
        setTargets(res.data);
      } catch (err) {
        console.error(err);
        setStatus('خطأ: تأكد من تشغيل خادم Backend أولاً!');
      }
    };
    fetchTargets();
  }, []);

  const compileAndUploadMindFile = async (allTargets) => {
    setStatus('جاري تجهيز الصور للذكاء الاصطناعي...');
    
    try {
      let CompilerClass = null;
      let attempts = 0;
      while(!CompilerClass && attempts < 10) {
        if (window.MINDARObject && window.MINDARObject.Compiler) {
           CompilerClass = window.MINDARObject.Compiler;
        } else {
           await new Promise(r => setTimeout(r, 500));
           attempts++;
        }
      }

      if (!CompilerClass) {
        setStatus('لم يتم تحميل مكتبة MindAR! تأكد من اتصالك بالإنترنت وأعد تحميل الصفحة.');
        return;
      }

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

        // تصغير الصورة برمجياً لمنع تعليق المتصفح وتسريع المعالجة 10 أضعاف
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 800; // أقصى عرض للتحليل
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

      const compiler = new CompilerClass();
      
      // لتفادي تجميد الواجهة، نستخدم setTimeout
      await new Promise(r => setTimeout(r, 100));

      await compiler.compileImageTargets(imageElements, (progress) => {
        setStatus(`جاري تحليل الذكاء الاصطناعي: ${Math.round(progress)}%`);
      });

      setStatus('جاري رفع السحابة للسيرفر...');
      const exportedBuffer = await compiler.exportData();
      const blob = new Blob([exportedBuffer]);
      const mindFormData = new FormData();
      mindFormData.append('mind', blob, 'targets.mind');

      await axios.post(`${API_URL}/api/compile`, mindFormData);
      setStatus('✅ تم تحديث التعرف بنجاح! التطبيق جاهز للاستخدام الآن.');
    } catch (err) {
      console.error('خطأ في التجميع:', err);
      setStatus(`❌ فشل في التجميع: ${err.message}`);
    }
  };

  const handleTargetUpload = async (e) => {
    e.preventDefault();
    if (!imageFile || !modelFile) return alert('يجب اختيار صورة ومجسم (Model) لإتمام عملية الرفع');
    
    setLoading(true);
    setStatus('جاري رفع البيانات للسيرفر...');

    const formData = new FormData();
    formData.append('name', name || `مُجسم ${targets.length + 1}`);
    formData.append('image', imageFile);
    formData.append('model', modelFile);

    try {
      const res = await axios.post(`${API_URL}/api/targets`, formData);
      const updatedTargets = [...targets, res.data];
      setTargets(updatedTargets);
      
      await compileAndUploadMindFile(updatedTargets);

      setName('');
      setImageFile(null);
      setModelFile(null);
      e.target.reset();
    } catch (err) {
      console.error(err);
      setStatus('❌ حدث خطأ أثناء الرفع!');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('هل أنت متأكد أنك تريد حذف هذا المجسم؟')) return;
    setLoading(true);
    setStatus('جاري الحذف...');
    try {
      const res = await axios.delete(`${API_URL}/api/targets/${id}`);
      const updatedTargets = res.data.targets;
      setTargets(updatedTargets);
      
      if (updatedTargets.length > 0) {
        await compileAndUploadMindFile(updatedTargets);
      } else {
        setStatus('تم الحذف. لا توجد أي مجسمات.');
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ حدث خطأ أثناء الحذف');
    }
    setLoading(false);
  };

  return (
    <div className="admin-container">
      <header>
         <h1>لوحة تحكم السحابة (محدث ✅)</h1>
         <p>أضف الصور والمجسمات وسيقوم المتصفح بدمجها ورفعها تلقائياً</p>
      </header>
      
      {status && (
        <div className={`status-box ${status.includes('✅') ? 'success' : ''} ${status.includes('❌') ? 'error' : ''}`}>
          {status}
        </div>
      )}

      <div className="upload-section card">
        <h2>إضافة ارتباط وتحديث التطبيق (خطوة واحدة)</h2>
        <form onSubmit={handleTargetUpload}>
          <div className="input-group">
            <label>اسم الارتباط للتنظيم:</label>
            <input type="text" placeholder="مثال: هاتف, كتاب" value={name} onChange={e => setName(e.target.value)} />
          </div>
          
          <div className="input-row">
            <div className="input-group">
              <label>صورة الهدف (.jpg, .png)</label>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} required />
              <small>يفضل ألا تزيد دقة الصورة عن عادية</small>
            </div>
            
            <div className="input-group">
              <label>المجسم المعروض (.glb)</label>
              <input type="file" accept=".glb" onChange={e => setModelFile(e.target.files[0])} required />
              <small>المجسم 3D الذي سيظهر على الصورة</small>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'الرجاء الانتظار (يتم معالجة البيانات)...' : 'تسجيل و تحديث اللعبة 🤖'}
          </button>
        </form>
      </div>

      <div className="targets-list card">
        <h2>المجسمات المسجلة تعمل حاليا ({targets.length})</h2>
        <div className="grid">
          {targets.map(t => (
            <div key={t.id} className="target-card">
              <div className="img-wrapper">
                 <img src={API_URL + t.imageUrl} alt={t.name} />
                 <span className="index-badge">فهرس: {t.index}</span>
              </div>
              <div className="info">
                <h3>{t.name}</h3>
                <button onClick={() => handleDelete(t.id)} className="btn-danger" disabled={loading}>حذف المجسم</button>
              </div>
            </div>
          ))}
          {targets.length === 0 && <p className="empty-text">لا توجد أي صور حالياً. التطبيق فارغ.</p>}
        </div>
      </div>
    </div>
  );
}

export default App;
