// MultiAI v0.5.4 - engine routing + Ollama setup
(function(){
  const q=s=>document.querySelector(s);
  const prevCall=window.callActiveProvider;
  const prevOpenSettings=window.openSettingsPanel;
  const DEFAULT_OLLAMA_MODEL='qwen3:1.7b';

  function account(){ try{return typeof getAccount==='function'?getAccount():JSON.parse(localStorage.getItem('multiai_account')||'null')}catch{return null} }
  function backend(){ try{return (typeof getBackendUrl==='function'?getBackendUrl():'').replace(/\/$/,'')}catch{return ''} }
  function normalizeOllamaUrl(v){
    v=String(v||'').trim().replace(/\/$/,'');
    if(!v)return '';
    if(!/^https?:\/\//i.test(v))v='http://'+v;
    if(!/\/v1$/i.test(v))v+='/v1';
    return v;
  }
  function ollamaUrl(){ return normalizeOllamaUrl(localStorage.getItem('multiai_ollama_url')||''); }
  function ollamaModel(){ return localStorage.getItem('multiai_ollama_model')||DEFAULT_OLLAMA_MODEL; }
  function hasKey(id){ try{return !!(typeof Android!=='undefined'&&Android.hasApiKey&&Android.hasApiKey(id))}catch{return false} }
  function firstKeyProvider(){
    const ids=['openai','anthropic','gemini','groq','deepseek','mistral','xai','openrouter','custom'];
    return ids.find(id=>hasKey(id))||'';
  }
  function engineReady(){ return !!(backend()||ollamaUrl()||firstKeyProvider()); }
  function providerDefaults(id){return (window.PROVIDERS&&PROVIDERS[id])||null}

  async function callOllama(){
    const url=ollamaUrl();
    if(!url)throw new Error('Ollama todavía no está conectado.');
    const history=typeof buildInput==='function'?buildInput():[];
    const messages=history.map(x=>({role:x.role,content:typeof x.content==='string'?x.content:JSON.stringify(x.content)}));
    if(typeof state!=='undefined'&&state.settings?.systemPrompt){messages.unshift({role:'system',content:state.settings.systemPrompt});}
    const r=await nativeRequest(joinUrl(url,'chat/completions'),'POST',{model:ollamaModel(),messages,stream:false},'','none');
    if(!r.ok)throw new Error(typeof extractApiError==='function'?extractApiError(r):(r.error||'No se pudo conectar con Ollama.'));
    const d=JSON.parse(r.body||'{}');
    return d.choices?.[0]?.message?.content||d.message?.content||d.response||'';
  }

  async function callSavedProvider(atts){
    const id=firstKeyProvider();
    if(!id)throw new Error('No hay un proveedor personal configurado.');
    const old={provider:state.settings.provider,baseUrl:state.settings.baseUrl,model:state.settings.model};
    const p=providerDefaults(id);
    try{
      state.settings.provider=id;
      state.settings.baseUrl=p?.base||'';
      state.settings.model=p?.model||'';
      return await prevCall(atts);
    }finally{
      state.settings.provider=old.provider;
      state.settings.baseUrl=old.baseUrl;
      state.settings.model=old.model;
    }
  }

  if(typeof prevCall==='function'){
    window.callActiveProvider=async function(atts=[]){
      const p=typeof providerInfo==='function'?providerInfo():null;
      if(p?.kind==='backend'&&!backend()){
        if(ollamaUrl())return callOllama();
        if(firstKeyProvider())return callSavedProvider(atts);
        setTimeout(()=>{try{window.openSettingsPanel?.('providers')}catch{}},180);
        throw new Error('No hay un motor de IA conectado. Conecta Ollama (sin API key) en Modelos y proveedores.');
      }
      if(p?.kind==='ollama')return callOllama();
      return prevCall(atts);
    };
    try{callActiveProvider=window.callActiveProvider}catch{}
  }

  function addEngineBanner(){
    if(!account()||engineReady()||q('#v054EngineBanner'))return;
    const host=q('#chatView'); if(!host)return;
    const b=document.createElement('div');
    b.id='v054EngineBanner';
    b.style.cssText='margin:10px 18px 0;padding:14px 16px;border:1px solid #343434;border-radius:18px;background:#171717;color:#ddd;display:flex;gap:12px;align-items:center;justify-content:space-between';
    b.innerHTML='<div><b>Conecta el motor de IA</b><div style="font-size:12px;color:#999;margin-top:4px">Ollama funciona sin API key desde tu PC o servidor.</div></div><button id="v054ConnectOllama" style="border:0;border-radius:14px;padding:10px 12px;background:#7c3aed;color:white;font-weight:700">Conectar Ollama</button>';
    const top=q('#chatScroll'); if(top&&top.parentNode)top.parentNode.insertBefore(b,top); else host.prepend(b);
    q('#v054ConnectOllama').onclick=()=>window.openSettingsPanel?.('providers');
  }
  function refreshBanner(){const b=q('#v054EngineBanner');if(engineReady()&&b)b.remove();else addEngineBanner()}

  if(typeof prevOpenSettings==='function'){
    window.openSettingsPanel=function(kind){
      prevOpenSettings(kind);
      if(kind!=='providers')return;
      setTimeout(()=>{
        const panel=q('#settingsPanel'); if(!panel)return;
        if(!q('#v054OllamaCard')){
          const card=document.createElement('div');card.id='v054OllamaCard';card.className='panel-card';
          card.innerHTML=`<p><b>Ollama · sin API key</b></p><p style="color:#aaa;font-size:13px">Conecta MultiAI a Ollama en un PC de tu red. En esta alpha está disponible para probar el motor local; el bloqueo definitivo por PLUS se hará cuando el servidor de cuentas Founder esté activo.</p><label class="field"><span>Dirección de Ollama</span><input id="v054OllamaUrl" placeholder="http://192.168.1.10:11434/v1" value="${typeof escapeHtml==='function'?escapeHtml(ollamaUrl()):ollamaUrl()}"></label><label class="field"><span>Modelo</span><input id="v054OllamaModel" placeholder="${DEFAULT_OLLAMA_MODEL}" value="${typeof escapeHtml==='function'?escapeHtml(ollamaModel()):ollamaModel()}"></label><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" id="v054SaveOllama">Guardar Ollama</button><button class="secondary" id="v054TestOllama">Probar conexión</button></div><p id="v054OllamaStatus" style="color:#aaa;font-size:12px"></p>`;
          panel.appendChild(card);
        }
        q('#v054SaveOllama').onclick=()=>{
          const u=normalizeOllamaUrl(q('#v054OllamaUrl').value);const m=q('#v054OllamaModel').value.trim()||DEFAULT_OLLAMA_MODEL;
          if(!u)return toast('Escribe la dirección de Ollama.',true);
          localStorage.setItem('multiai_ollama_url',u);localStorage.setItem('multiai_ollama_model',m);
          if(state?.settings){state.settings.provider='multiai';state.settings.model='auto';state.settings.baseUrl='';localStorage.setItem('multiai_settings',JSON.stringify(state.settings));}
          q('#v054OllamaUrl').value=u;toast('Ollama guardado');refreshBanner();
        };
        q('#v054TestOllama').onclick=async()=>{
          const out=q('#v054OllamaStatus');const u=normalizeOllamaUrl(q('#v054OllamaUrl').value);if(!u){out.textContent='Escribe la dirección primero.';return}
          out.textContent='Probando…';
          try{const r=await nativeRequest(joinUrl(u,'models'),'GET',null,'','none',{});if(!r.ok)throw new Error(r.error||('HTTP '+r.status));const d=JSON.parse(r.body||'{}');const names=(d.data||[]).map(x=>x.id).slice(0,6);out.textContent='Conectado ✓'+(names.length?' · '+names.join(', '):'');}
          catch(e){out.textContent='No se pudo conectar: '+(e.message||String(e));}
        };
      },0);
    };
    try{openSettingsPanel=window.openSettingsPanel}catch{}
  }

  const prevSetAccount=window.setAccount;
  if(typeof prevSetAccount==='function'){
    window.setAccount=function(a,t=''){prevSetAccount(a,t);setTimeout(refreshBanner,50)};
    try{setAccount=window.setAccount}catch{}
  }

  window.addEventListener('load',()=>setTimeout(()=>{
    const v=q('#version');if(v)v.textContent='0.5.4 alpha';
    refreshBanner();
    if(typeof updateKeyStatus==='function')updateKeyStatus();
  },120));
})();
