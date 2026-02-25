import { useState, useCallback, useRef } from 'react';
import Head from 'next/head';

const STATUS_COLOR = {
  ASIGNADA: '#00c853',
  DISPONIBLE: '#00c853',
  'SIN INFORMACIÓN': '#ffab00',
  EXTRAVIADA: '#ff6d00',
  BLOQUEADA: '#ff6d00',
  default: '#e30613',
};

function getStatusColor(estado) {
  if (!estado) return STATUS_COLOR.default;
  for (const [key, color] of Object.entries(STATUS_COLOR)) {
    if (estado.toUpperCase().includes(key)) return color;
  }
  return STATUS_COLOR.default;
}

function SimCard({ item }) {
  const color = item.found ? getStatusColor(item.estado) : '#e30613';
  return (
    <div style={{
      background: '#111', border: `1px solid #2a2a2a`, borderLeft: `3px solid ${color}`,
      borderRadius: 4, padding: 16, position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <code style={{ fontSize: 12, color: '#e0e0e0' }}>{item.serie || item.detected || item.number}</code>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '3px 8px',
          borderRadius: 2, textTransform: 'uppercase', border: `1px solid ${color}40`,
          background: `${color}20`, color
        }}>
          {item.found ? (item.estado || 'SIN ESTADO') : 'NO ENCONTRADA / DADA DE BAJA'}
        </span>
      </div>
      {item.found && <>
        {item.linea && <Row label="Línea" val={item.linea} />}
        {item.cuenta && <Row label="Cuenta" val={item.cuenta} small />}
        {item.ubicacion && <Row label="Ubicación" val={item.ubicacion} />}
      </>}
      {!item.found && (
        <p style={{ color: '#e30613', fontSize: 13, margin: 0 }}>
          No figura en la base de datos — posiblemente dada de baja
        </p>
      )}
      {item._source && <Row label="Archivo" val={item._source} muted />}
    </div>
  );
}

function Row({ label, val, small, muted }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'baseline' }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#666', minWidth: 70 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: small ? 11 : 12, color: muted ? '#666' : '#e0e0e0' }}>{val}</span>
    </div>
  );
}

export default function Home() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, text: '' });
  const [thumbs, setThumbs] = useState([]);
  const [manualQ, setManualQ] = useState('');
  const [manualResult, setManualResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const processFiles = useCallback(async (files) => {
    if (!files.length) return;
    setError('');
    setResults([]);
    setLoading(true);
    setProgress({ current: 0, total: files.length, text: 'Iniciando...' });

    // Previews
    setThumbs(files.map(f => ({ url: URL.createObjectURL(f), status: 'processing', name: f.name })));

    const allResults = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length, text: `Analizando ${file.name}...` });
      setThumbs(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'processing' } : t));

      try {
        const b64 = await toBase64(file);
        const resp = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: b64, mimeType: file.type }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Error del servidor');

        const fileResults = data.results.map(r => ({ ...r, _source: file.name }));
        if (fileResults.length === 0) {
          fileResults.push({ found: false, number: '(no detectado)', _source: file.name });
        }
        allResults.push(...fileResults);
        setThumbs(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'ok' } : t));
      } catch (err) {
        setThumbs(prev => prev.map((t, idx) => idx === i ? { ...t, status: 'err' } : t));
        setError(prev => prev + `\nError en ${file.name}: ${err.message}`);
      }
      setResults([...allResults]);
    }

    setProgress({ current: files.length, total: files.length, text: `✅ Listo — ${files.length} imagen(es) procesada(s)` });
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    processFiles(files);
  }, [processFiles]);

  const searchManual = async () => {
    if (!manualQ.trim()) return;
    const resp = await fetch(`/api/lookup?q=${encodeURIComponent(manualQ.trim())}`);
    const data = await resp.json();
    setManualResult(data);
  };

  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found);
  const pct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <>
      <Head>
        <title>Verificador SIMs CLARO</title>
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; color: #e0e0e0; font-family: 'Rajdhani', sans-serif; min-height: 100vh; }
        input, button { font-family: 'Rajdhani', sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .btn { background: #e30613; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; border-radius: 3px; }
        .btn:hover { opacity: 0.85; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .section-title { font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #666; margin: 28px 0 12px; display: flex; align-items: center; gap: 8px; }
        .section-title::after { content: ''; flex: 1; height: 1px; background: #2a2a2a; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
      `}</style>

      {/* Header */}
      <div style={{ background: '#111', borderBottom: '2px solid #e30613', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ background: '#e30613', color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 10px' }}>CLARO</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>Verificador de SIMs</h1>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#666', marginLeft: 'auto' }}>6.878 SIMs en base</span>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>

        {/* Upload zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed #2a2a2a', background: '#111', borderRadius: 4,
            padding: 48, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e30613'; e.currentTarget.style.background = '#1a0a0a'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.background = '#111'; }}
        >
          <input ref={inputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
            onChange={e => processFiles(Array.from(e.target.files))} />
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Subir imágenes de SIMs</h2>
          <p style={{ color: '#666', fontSize: 14, fontFamily: 'monospace' }}>Arrastrá o hacé click · JPG, PNG, WEBP · Múltiples archivos</p>
        </div>

        {/* Thumbs */}
        {thumbs.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {thumbs.map((t, i) => (
              <img key={i} src={t.url} alt={t.name} style={{
                width: 80, height: 60, objectFit: 'cover', borderRadius: 3,
                border: `2px solid ${t.status === 'processing' ? '#e30613' : t.status === 'ok' ? '#00c853' : '#ffab00'}`,
                animation: t.status === 'processing' ? 'pulse 1s infinite' : 'none'
              }} />
            ))}
          </div>
        )}

        {/* Progress */}
        {loading && (
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 4, padding: 20, marginTop: 16 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#666', marginBottom: 10 }}>{progress.text}</div>
            <div style={{ background: '#2a2a2a', borderRadius: 2, height: 4, overflow: 'hidden' }}>
              <div style={{ background: '#e30613', height: '100%', width: `${pct}%`, transition: 'width 0.3s', borderRadius: 2 }} />
            </div>
          </div>
        )}
        {!loading && progress.text && (
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#00c853', marginTop: 10 }}>{progress.text}</div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#e3061310', border: '1px solid #e3061340', color: '#e30613', padding: '12px 16px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, marginTop: 12, whiteSpace: 'pre-line' }}>
            {error}
          </div>
        )}

        {/* Stats */}
        {results.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Detectadas', val: results.filter(r => r.detected).length, color: '#2979ff' },
              { label: 'Activas / En base', val: found.length, color: '#00c853' },
              { label: 'Sin registro / Baja', val: notFound.length, color: '#e30613' },
            ].map(s => (
              <div key={s.label} style={{ background: '#111', border: '1px solid #2a2a2a', padding: '12px 20px', borderRadius: 4, flex: 1, minWidth: 120, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {found.length > 0 && <>
          <div className="section-title">Encontradas en base ({found.length})</div>
          <div className="grid">{found.map((item, i) => <SimCard key={i} item={item} />)}</div>
        </>}
        {notFound.length > 0 && <>
          <div className="section-title">Sin registro / Dadas de baja ({notFound.length})</div>
          <div className="grid">{notFound.map((item, i) => <SimCard key={i} item={item} />)}</div>
        </>}

        {/* Manual search */}
        <div style={{ marginTop: 40, background: '#111', border: '1px solid #2a2a2a', borderRadius: 4, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#666', marginBottom: 14 }}>
            🔍 Búsqueda manual por Nro. de Serie o Línea
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text" value={manualQ} onChange={e => setManualQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchManual()}
              placeholder="Ej: 056426839 o 1127067248 o número de serie completo"
              style={{ flex: 1, background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#e0e0e0', fontFamily: 'monospace', fontSize: 14, padding: '10px 14px', borderRadius: 3, outline: 'none' }}
            />
            <button className="btn" onClick={searchManual}>Buscar</button>
          </div>
          {manualResult && <div style={{ marginTop: 12 }}><SimCard item={manualResult} /></div>}
        </div>

      </div>
    </>
  );
}
