/* global BpmnJS */
(() => {
  'use strict';
  const data = window.PROCESS_DOCS;
  const $ = id => document.getElementById(id);
  const types = {startEvent:'Evento de inicio',endEvent:'Evento de fin',userTask:'Tarea humana',serviceTask:'Tarea del sistema',exclusiveGateway:'Decisión exclusiva'};
  let active, generation = 0, selected, importQueue = Promise.resolve();
  const viewer = new BpmnJS({ container: '#canvas' });
  const text = (id,value) => { $(id).textContent = value; };
  const list = (id,items) => $(id).replaceChildren(...items.map(item => { const li=document.createElement('li'); li.textContent=item; return li; }));
  const gitURL = source => 'https://github.com/carlosacostap-unca/eventos/blob/'+data.revision+'/'+source.split('/').map(encodeURIComponent).join('/');
  function links(id,items) {
    $(id).replaceChildren(...items.map(source => {const li=document.createElement('li'),a=document.createElement('a');a.href=gitURL(source);a.target='_blank';a.rel='noopener';a.textContent=source;li.append(a);return li;}));
  }
  function renderNav(query='') {
    const words=query.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const matches=data.processes.filter(model => (model.title+' '+model.category+' '+model.rules.join(' ')).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(words));
    $('procesos').replaceChildren(...matches.map(model => {const a=document.createElement('a'),code=document.createElement('span');a.href='#'+model.id;code.textContent=model.code;a.append(code,document.createTextNode(model.title));if(active?.id===model.id)a.setAttribute('aria-current','page');return a;}));
    $('sin-resultados').hidden=matches.length>0;
  }
  function selectNode(node,center=false) {
    if(!active)return;
    if(selected) viewer.get('canvas').removeMarker(selected,'selected');
    selected=node?.bpmnId;
    if(node){viewer.get('canvas').addMarker(selected,'selected');text('elemento-titulo',node.name);text('elemento-detalle',node.detail);text('elemento-tipo',types[node.type]+' · '+active.lanes[node.lane]);if(center)viewer.get('canvas').scrollToElement(selected);}
    else{text('elemento-titulo','El proceso completo');text('elemento-detalle',active.summary+' Seleccioná un elemento del diagrama o de la lista de actividades para leer su responsabilidad y reglas.');text('elemento-tipo','Modelo descriptivo · '+active.code);}
  }
  function tab(id,focus=false) {
    document.querySelectorAll('[role=tab]').forEach(button => {const on=button.getAttribute('aria-controls')===id;button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;$(button.getAttribute('aria-controls')).hidden=!on;if(on&&focus)button.focus();});
  }
  function fit(){if(active&&viewer.get('elementRegistry').getAll().length)viewer.get('canvas').zoom('fit-viewport','auto');}
  async function openProcess() {
    const request=++generation;
    const id=location.hash.slice(1).split('/')[0];
    active=data.processes.find(model=>model.id===id)||data.processes[0];
    if(location.hash)$('contenido').scrollIntoView({block:'start'});
    selected=null;
    document.title=active.title+' · Ingeniería de procesos · Eventos UNCA';
    text('codigo',active.code);text('categoria',active.category);text('titulo',active.title);text('resumen',active.summary);text('actores',active.lanes.join(' + '));text('cantidad',active.nodes.length+' elementos · '+active.flows.length+' flujos');text('disparador',active.trigger);text('resultado',active.outcome);
    list('lista-reglas',active.rules);list('analisis',active.analysis);links('fuentes',active.sources);links('especificaciones',[...active.specs.map(spec=>'openspec/specs/'+spec+'/spec.md'),...(active.docs||[])]);links('pruebas',active.tests);
    $('lista-actividades').replaceChildren(...active.nodes.map((node,index)=>{const button=document.createElement('button'),number=document.createElement('span'),body=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small');button.type='button';button.className='activity';number.textContent=String(index+1).padStart(2,'0');title.textContent=node.name;meta.textContent=types[node.type]+' · '+active.lanes[node.lane];body.append(title,meta);button.append(number,body);button.onclick=()=>selectNode(node,true);return button;}));
    const index=data.processes.indexOf(active),previous=data.processes[(index+data.processes.length-1)%data.processes.length],next=data.processes[(index+1)%data.processes.length];
    $('anterior').href='#'+previous.id;text('anterior','← '+previous.title);$('siguiente').href='#'+next.id;text('siguiente',next.title+' →');
    renderNav($('buscar').value);tab('reglas');text('estado','Cargando proceso…');
    const model = active;
    try{const result=await (importQueue=importQueue.catch(()=>{}).then(()=>request===generation?viewer.importXML(model.xml):null));if(request!==generation)return;if(result.warnings.length)throw new Error(result.warnings.map(w=>w.message).join('; '));fit();selectNode(null);text('estado','');document.documentElement.dataset.process=active.id;document.documentElement.dataset.ready='true';}
    catch(error){if(request!==generation)return;text('estado','No se pudo mostrar el diagrama. Podés descargar el BPMN o consultar las actividades. '+error.message);document.documentElement.dataset.ready='error';}
  }
  function download(content,type,filename){const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('.exports').open=false;}
  async function exportSVG(){const {svg}=await viewer.saveSVG();return svg;}
  viewer.on('element.click',event=>selectNode(active?.nodes.find(node=>node.bpmnId===event.element.id)));
  $('buscar').addEventListener('input',event=>renderNav(event.target.value));
  $('acercar').onclick=()=>viewer.get('canvas').zoom(Math.min(viewer.get('canvas').zoom()*1.25,3));
  $('alejar').onclick=()=>viewer.get('canvas').zoom(Math.max(viewer.get('canvas').zoom()/1.25,.2));
  $('ajustar').onclick=fit;
  $('ampliar').onclick=async()=>{const panel=$('panel-diagrama');if(document.fullscreenElement){await document.exitFullscreen();}else if(panel.classList.contains('expanded'))panel.classList.remove('expanded');else{try{await panel.requestFullscreen();}catch{panel.classList.add('expanded');}}text('ampliar',document.fullscreenElement||panel.classList.contains('expanded')?'Cerrar':'Ampliar');requestAnimationFrame(fit);};
  document.addEventListener('fullscreenchange',()=>{text('ampliar',document.fullscreenElement?'Cerrar':'Ampliar');requestAnimationFrame(fit);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('panel-diagrama').classList.contains('expanded')){$('panel-diagrama').classList.remove('expanded');text('ampliar','Ampliar');fit();}});
  $('bpmn').onclick=()=>download(active.xml,'application/xml',active.id+'.bpmn');
  $('svg').onclick=async()=>{try{download(await exportSVG(),'image/svg+xml',active.id+'.svg');}catch(error){text('estado','No se pudo exportar: '+error.message);}};
  $('png').onclick=async()=>{try{const svg=await exportSVG(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),img=new Image();try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Imagen no disponible'));img.src=url;});const canvas=document.createElement('canvas');canvas.width=Math.ceil(img.width*2);canvas.height=Math.ceil(img.height*2);const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('No se pudo componer la imagen');download(blob,'image/png',active.id+'.png');}finally{URL.revokeObjectURL(url);}}catch(error){text('estado','No se pudo exportar: '+error.message);}};
  const stored=(()=>{try{return localStorage.getItem('eventos-process-theme');}catch{return null;}})();
  function theme(dark){document.body.classList.toggle('dark',dark);$('tema').setAttribute('aria-pressed',String(dark));text('tema',dark?'Tema claro':'Tema oscuro');}
  theme(stored==='dark');$('tema').onclick=()=>{const dark=!document.body.classList.contains('dark');theme(dark);try{localStorage.setItem('eventos-process-theme',dark?'dark':'light');}catch{/* La lectura funciona sin almacenamiento local. */}};
  document.querySelectorAll('[role=tab]').forEach(button=>{button.onclick=()=>tab(button.getAttribute('aria-controls'));button.onkeydown=event=>{const tabs=[...document.querySelectorAll('[role=tab]')],index=tabs.indexOf(button);let target;if(event.key==='ArrowRight')target=(index+1)%tabs.length;if(event.key==='ArrowLeft')target=(index+tabs.length-1)%tabs.length;if(event.key==='Home')target=0;if(event.key==='End')target=tabs.length-1;if(target!==undefined){event.preventDefault();tab(tabs[target].getAttribute('aria-controls'),true);}};});
  text('revision',data.revision.slice(0,7));$('revision').href='https://github.com/carlosacostap-unca/eventos/commit/'+data.revision;
  let timer;new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(fit,120);}).observe($('canvas'));
  window.addEventListener('hashchange',()=>{if(location.hash==='#contenido')return;document.documentElement.dataset.ready='false';openProcess();});
  openProcess();
})();
