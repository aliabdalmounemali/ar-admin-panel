import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// في المرحلة الرابعة، هذا الرابط يتغير ليكون السيرفر العالمي
const API_URL = "ar-app-backend-production.up.railway.app";

function App() {
  const [targets, setTargets] = useState([]);
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [modelFile, setModelFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/targets`);
      setTargets(res.data);
    } catch (err) {
      console.error(err);
      setStatus('خطأ: تأكد من تشغيل خادم Backend أولاً!');
    }
  };

  const handleTargetUpload = async (e) => {
    e.preventDefault();
    if (!imageFile || !modelFile) return alert('يجب اختيار صورة لتعرف الكاميرا عليها ومجسم لعرضه');
    
    setLoading(true);
    setStatus('جاري رفع الصور... (الدمج سيتم أوتوماتيكياً بواسطة السيرفر السحابي)');

    const formData = new FormData();
    formData.append('name', name || `عنصر ${targets.length + 1}`);
    formData.append('image', imageFile);
    formData.append('model', modelFile);

    try {
      const res = await axios.post(`${API_URL}/api/targets`, formData);
      setTargets([...targets, res.data]);
      
      setName('');
      setImageFile(null);
      setModelFile(null);
      e.target.reset(); // تفريغ الخانات
      setStatus('✅ العملية تمت بنجاح! السيرفر سيقوم بدمج الصور وتحديث التطبيق الآن.');
    } catch (err) {
      console.error(err);
      setStatus('❌ حدث خطأ أثناء الرفع!');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('هل تريد حذف هذه الصورة؟ سيتم إزالتها من التطبيق للكل.')) return;
    setLoading(true);
    setStatus('جاري الحذف...');
    try {
      const res = await axios.delete(`${API_URL}/api/targets/${id}`);
      setTargets(res.data.targets);
      setStatus('✅ تم الحذف و تحديث السيرفر بنجاح');
    } catch (err) {
      console.error(err);
      setStatus('❌ حدث خطأ أثناء الحذف');
    }
    setLoading(false);
  };

  return (
    <div className="admin-container">
      <header>
         <h1>لوحة تحكم السحابة (الإصدار الأوتوماتيكي)</h1>
         <p>أضف الصور والمجسمات ليقوم الخادم الكلاود بدمجها فوراً للتطبيق ☁️</p>
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
            <input type="text" placeholder="مثال: غلاف كتاب" value={name} onChange={e => setName(e.target.value)} />
          </div>
          
          <div className="input-row">
            <div className="input-group">
              <label>صورة الهدف (.jpg, .png)</label>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} required />
              <small>الصورة التي يوجه المستخدم لها الكاميرا</small>
            </div>
            
            <div className="input-group">
              <label>المجسم المعروض (.glb)</label>
              <input type="file" accept=".glb" onChange={e => setModelFile(e.target.files[0])} required />
              <small>المجسم 3D الذي سيظهر على الصورة</small>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'الرجاء الانتظار (يتم دمج ومعالجة الصورة في الخادم)...' : 'تسجيل و تحديث اللعبة 🤖'}
          </button>
        </form>
      </div>

      <div className="targets-list card">
        <h2>المجسمات المسجلة تعمل حالياً ({targets.length})</h2>
        <div className="grid">
          {targets.map(t => (
            <div key={t.id} className="target-card">
              <div className="img-wrapper">
                 <img src={API_URL + t.imageUrl} alt={t.name} />
                 <span className="index-badge">المؤشر: {t.index}</span>
              </div>
              <div className="info">
                <h3>{t.name}</h3>
                <button onClick={() => handleDelete(t.id)} className="btn-danger" disabled={loading}>حذف نهائي</button>
              </div>
            </div>
          ))}
          {targets.length === 0 && <p className="empty-text">لا توجد أي صور حالياً، التطبيق فارغ.</p>}
        </div>
      </div>
    </div>
  );
}

export default App;
