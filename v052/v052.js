// MultiAI v0.5.2 - robust local account hotfix
(function(){
  const $q=s=>document.querySelector(s);
  const STORE='multiai_local_accounts_v2';
  function accounts(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
  function saveAccounts(v){localStorage.setItem(STORE,JSON.stringify(v))}
  function normEmail(v){return String(v||'').trim().toLowerCase()}
  async function hashPassword(email,password){
    const raw=new TextEncoder().encode(normEmail(email)+'|MultiAI-v052|'+password);
    if(window.crypto&&crypto.subtle){
      const b=await crypto.subtle.digest('SHA-256',raw);
      return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
    }
    let h=2166136261;for(const x of raw){h^=x;h=Math.imul(h,16777619)}return 'f'+(h>>>0).toString(16);
  }
  async function localRegister(name,email,password){
    email=normEmail(email);name=String(name||'').trim();
    if(name.length<2) throw new Error('Escribe un nombre válido.');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Escribe un correo válido.');
    if(String(password||'').length<6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    const db=accounts();if(db[email]) throw new Error('Ya existe una cuenta con ese correo en este dispositivo.');
    const user={id:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),mode:'local',name,email,plan:'free',createdAt:Date.now()};
    db[email]={user,passwordHash:await hashPassword(email,password)};saveAccounts(db);return user;
  }
  async function localLogin(email,password){
    email=normEmail(email);const db=accounts(),rec=db[email];
    if(!rec) throw new Error('No existe una cuenta con ese correo en este dispositivo.');
    if(rec.passwordHash!==await hashPassword(email,password)) throw new Error('Contraseña incorrecta.');
    return rec.user;
  }
  function showError(msg){const e=$q('#authError');if(e)e.textContent=msg||''}
  window.submitAccount=async function(){
    const email=normEmail($q('#authEmail')?.value), password=$q('#authPassword')?.value||'', name=$q('#authName')?.value||'';
    const mode=window.authMode||authMode||'login';
    if(!email||!password||(mode==='register'&&!name.trim())){showError('Completa todos los campos.');return}
    const btn=$q('#authSubmitBtn');if(btn){btn.disabled=true;btn.textContent=mode==='register'?'Creando…':'Entrando…'};showError('');
    try{
      const backend=typeof getBackendUrl==='function'?getBackendUrl():'';
      if(backend){
        try{
          const path=mode==='register'?'auth/register':'auth/login';
          const r=await nativeRequest(joinUrl(backend,path),'POST',{name,email,password},'','none');
          if(!r.ok)throw new Error(typeof extractApiError==='function'?extractApiError(r):'El servidor rechazó la solicitud.');
          const d=JSON.parse(r.body||'{}');if(!d.user)throw new Error('Respuesta inválida del servidor.');
          setAccount(d.user,d.token||'');hideAuthForm();toast(mode==='register'?'Cuenta creada':'Sesión iniciada');return;
        }catch(serverErr){
          console.warn('Backend account failed, using local fallback',serverErr);
        }
      }
      let user;
      if(typeof Android!=='undefined'){
        try{
          const raw=mode==='register'?Android.registerLocalAccount(name,email,password):Android.loginLocalAccount(email,password);
          user=JSON.parse(raw);
        }catch(nativeErr){console.warn('Native account storage failed, using WebView fallback',nativeErr)}
      }
      if(!user) user=mode==='register'?await localRegister(name,email,password):await localLogin(email,password);
      setAccount(user,'local');hideAuthForm();
      toast(mode==='register'?'Cuenta creada correctamente':'Sesión iniciada');
    }catch(err){showError(err?.message||String(err));}
    finally{if(btn){btn.disabled=false;btn.textContent=mode==='register'?'Crear cuenta':'Iniciar sesión'}}
  };
  function bind(){
    const create=$q('#authCreateBtn'),login=$q('#authLoginBtn'),submit=$q('#authSubmitBtn'),cancel=$q('#authCancelBtn');
    if(create)create.onclick=()=>{window.authMode=authMode='register';showAuthForm('register');setTimeout(()=>$q('#authName')?.focus(),80)};
    if(login)login.onclick=()=>{window.authMode=authMode='login';showAuthForm('login');setTimeout(()=>$q('#authEmail')?.focus(),80)};
    if(submit)submit.onclick=window.submitAccount;
    if(cancel)cancel.onclick=hideAuthForm;
    const form=$q('#authForm');
    form?.querySelectorAll('input').forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window.submitAccount()}}));
  }
  if(document.readyState==='complete')bind(); else window.addEventListener('load',()=>setTimeout(bind,0));
})();