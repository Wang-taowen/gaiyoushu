const icons = {
 course:'M4 5h16v12H4z M8 21h8 M12 17v4',book:'M4 5h7a1 1 0 0 1 1 1v14a5 5 0 0 0-4-2H4z M20 5h-7a1 1 0 0 0-1 1v14a5 5 0 0 1 4-2h4z',
 pen:'m4 16-1 5 5-1L20 8l-4-4z M13 7l4 4',bookmark:'M6 4h12v17l-6-4-6 4z',search:'M16 16l5 5 M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
 arrow:'M4 12h15m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',file:'M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h6',
 play:'M8 5v14l12-7z',clock:'M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',grid:'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z'
};
const icon = (id) => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="'+icons[id]+'"/></svg>';
const pages = {course:['课程定位','course'],learn:['资源学习','book'],practice:['练习核对','pen'],records:['个人记录','bookmark']};
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const fallback = {saved:{},notes:{},history:[],answers:{},term:'2026 秋季'};
let data;
try {data = {...fallback,...JSON.parse(localStorage.getItem('gaiyoushu-v1') || '{}')};} catch {data = fallback;}
let course = {query:'',type:'all',order:'chapter',group:'all'};
let filters = {topic:'all',year:'all',exam:'all'};
let recordTab = 'saved', recordTopic = 'all';
let replayTimer, replaySeconds = 0, activeResource, toastTimer, lastFocus;
const termOptions = ['2026 秋季','2026 春季','2025 秋季'];
const getTopic = id => topics.find(topic => topic.id === id);
const page = () => {const [section,id,index] = location.hash.slice(1).split('/'); return {section:Object.hasOwn(pages,section)?section:'course',id,index:Number(index)||0};};
const year = () => data.term.slice(0,4);
const ref = (section,id,index=0) => '#'+section+'/'+id+(index?'/'+index:'');
const two = n => String(n).padStart(2,'0');
const time = n => two(Math.floor(n/60))+':'+two(n%60);
const save = () => {
  try {localStorage.setItem('gaiyoushu-v1',JSON.stringify(data));return true;}
  catch {tell('浏览器无法保存数据，本次记录仅保留在当前页面');return false;}
};
function tell(message) {
  $('toast').textContent=message;
  $('toast').classList.add('shown');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('toast').classList.remove('shown'),2800);
}
function remember(section,t,index=0,resource) {
  const link = ref(section,t.id,index);
  const key = resource ? link+'/'+resource.kind : link;
  data.history = [{key,link,id:t.id,label:resource?.label || (section==='learn'?t.name:t.name+' · 第 '+(index+1)+' 题'),resource,date:Date.now()},...data.history.filter(item=>item.key!==key)].slice(0,80);
  save();
}
const meta = t => '第 '+two(t.ch)+' 章 <span class="dot">·</span> 第 '+two(t.week)+' 周';
const source = (label,t) => '<div class="source">来源：元组自编'+label+' · '+year()+' 年演示版 · 适用：'+t.name+' · '+data.term+'课程示例</div>';
const btn = (label,action,attrs='',cls='button') => '<button class="'+cls+'" data-action="'+action+'" '+attrs+'>'+label+'</button>';
const link = (label,url,cls='button') => '<a class="'+cls+'" href="'+url+'">'+label+'</a>';
const select = (id,label,options,value) => '<label class="select"><span class="sr">'+label+'</span><select id="'+id+'">'+options.map(([v,l])=>'<option value="'+v+'" '+(v===value?'selected':'')+'>'+l+'</option>').join('')+'</select></label>';
const chapterNames = [...new Map(topics.map(t=>[t.ch,t.group]))];
const topicOptions = [['all','全部知识点'],...topics.map(t=>[t.id,t.name])];
const heading = (name,desc,back='') => '<section class="page-head">'+(back?link('← '+back,'#course','back'):'')+'<h1>'+name+'</h1><p>'+desc+'</p></section>';
const bookmarks = (key,id,label,kind='') => btn(icon('bookmark')+(data.saved[key]?'已收藏':'收藏'),'bookmark','data-key="'+key+'" data-id="'+id+'" data-kind="'+kind+'" data-label="'+label+'" aria-pressed="'+Boolean(data.saved[key])+'"','button '+(data.saved[key]?'selected':''));
function coursePage() {
  const recent=data.history[0];
  return '<section class="hero"><div class="hero-copy"><button class="course-pill" data-action="scope"><i></i> 北京大学 · 概率统计（B） <b>⌄</b></button><h1>看见世界的<br><em>不确定性<span>。</span></em></h1><p>按知识点查找课件、回放与教材，理解解题依据，<br class="desktop">再用同类题检验自己是否掌握。</p><div class="hero-actions">'+btn('浏览课程 '+icon('arrow'),'browse','','button primary')+(recent?.resource?btn(icon('clock')+'继续学习','resource','data-id='+recent.id+' data-kind='+recent.resource.kind+' data-position='+recent.resource.position,'button soft'):link(icon('clock')+(recent?'继续学习':'学习记录'),recent?.link||'#records','button soft'))+'</div></div><div class="hero-visual"><div class="graph-top"><div><small>PROBABILITY DENSITY</small><strong>标准正态分布</strong></div><span>N(0, 1)</span></div><canvas id="graph" aria-label="标准正态密度曲线，均值为零"></canvas><div class="graph-foot"><span><i></i> 概率密度 f(x)</span><span>μ = 0 <b>·</b> σ = 1</span></div></div></section>'+
  '<section class="course-section" id="catalog"><div class="section-head"><div><h2>课程知识地图</h2><p>按章节或周次浏览，找到当前卡住的知识点。</p></div><button class="semester" data-action="scope"><i></i>'+data.term+' · 示例学期 <b>⌄</b></button></div><div class="catalog"><aside class="sidebar"><div class="side-title">'+icon('grid')+'课程目录</div><div class="switch">'+btn('按章节','order','data-value="chapter"','switch-btn '+(course.order==='chapter'?'on':''))+btn('按周次','order','data-value="week"','switch-btn '+(course.order==='week'?'on':''))+'</div><div id="groups"></div></aside><div class="catalog-main"><form id="search" class="search">'+icon('search')+'<input id="query" type="search" aria-label="搜索课程知识点" placeholder="搜索知识点、题号或关键词" value="'+esc(course.query)+'"><button type="submit">搜索</button></form><div class="filter-bar" id="course-types"></div><div id="results"></div></div></div></section>';
}
function updateCourse() {
  const groups = course.order==='chapter'?chapterNames.map(([id,name])=>[id,'第 '+two(id)+' 章',name]):topics.map(t=>[t.week,'第 '+two(t.week)+' 周',t.name]);
  $('groups').innerHTML=btn('全部知识点 <span>'+topics.length+'</span>','group','data-value="all"','group '+(course.group==='all'?'current':''))+groups.map(([id,n,label])=>btn('<small>'+n+'</small><span>'+label+'</span>','group','data-value="'+id+'"','group '+(String(id)===course.group?'current':''))).join('');
  $('course-types').innerHTML=[['all','全部资源'],...resources.map(r=>[r.id,r.name]),['practice','同类试题']].map(([id,name])=>btn(name,'type','data-value="'+id+'"','chip '+(course.type===id?'on':''))).join('');
  const query=course.query.trim().toLowerCase();
  const matches=topics.filter(t=>(course.group==='all'||String(course.order==='chapter'?t.ch:t.week)===course.group)&&query.split(/\s+/).every(word=>[t.name,t.group,t.tags,t.desc,'第'+t.ch+'章','第'+t.week+'周',...t.questions.map((q,i)=>t.id+'-'+(i+1)+' '+q[0])].join(' ').toLowerCase().includes(word)));
  $('results').innerHTML='<div class="result-count" aria-live="polite">共 '+matches.length+' 个知识点</div>'+ (matches.length?matches.map(t=>{
    const filtered=resources.find(r=>r.id===course.type);
    const url=course.type==='practice'?ref('practice',t.id):ref('learn',t.id);
    const details=filtered ? btn(icon(filtered.icon)+filtered.name,'resource','data-id="'+t.id+'" data-kind="'+filtered.id+'"','tag '+filtered.color) : course.type==='practice' ? link(icon('pen')+'2 道同类题',url,'tag peach') : [...resources.map(r=>btn(icon(r.icon)+r.name,'resource','data-id="'+t.id+'" data-kind="'+r.id+'"','tag '+r.color)),link(icon('pen')+'同类题',ref('practice',t.id),'tag peach')].join('');
    return '<article class="topic-card"><div class="topic-number">'+two(course.order==='chapter'?t.ch:t.week)+'</div><div class="topic-text"><div class="eyeline">'+meta(t)+'</div><h3>'+link(t.name,url,'title-link')+'</h3><p>'+t.desc+'</p><div class="tags">'+details+'</div></div>'+link(icon('chevron'),url,'round')+'</article>';
  }).join(''):'<div class="empty">没有匹配的知识点。试试“贝叶斯”“概率密度”或“方差”。</div>');
}
function learnPage(t) {
  if(!t) return heading('资源学习','选择知识点，按页码、时间点和章节查看讲解。')+'<div class="library">'+topics.map(t=>'<article class="panel"><div class="eyeline">'+meta(t)+'</div><h3>'+t.name+'</h3><p>'+t.desc+'</p>'+link('查看讲解 '+icon('arrow'),ref('learn',t.id),'button')+'</article>').join('')+'</div>';
  return heading(t.name,t.desc,'课程目录')+'<div class="detail-top"><div class="eyeline">'+meta(t)+' <span class="dot">·</span> '+t.group+'</div>'+bookmarks('topic/'+t.id,t.id,t.name)+'</div><div class="detail-grid"><div><article class="panel lesson"><h2>概念与适用条件</h2><div class="formula">'+t.rule+'</div><p>'+t.condition+'</p><details><summary>先修知识</summary><p>'+t.pre+'</p></details><h2>分步例题</h2><ol class="steps">'+t.steps.map(s=>'<li>'+s+'</li>').join('')+'</ol></article></div><aside><article class="panel"><h2>关联课程资源</h2><p>来源、年份及适用范围见各资源详情。</p><div class="resource-list">'+resources.map(r=>btn('<span class="resource-icon '+r.color+'">'+icon(r.icon)+'</span><span><strong>'+r.name+'</strong><small>'+r.desc+'</small></span>'+icon('chevron'),'resource','data-id="'+t.id+'" data-kind="'+r.id+'"','resource')).join('')+'</div></article><article class="panel next"><h2>检验理解</h2><p>完成同类题，核对思路与答案。</p>'+link('开始练习 '+icon('arrow'),ref('practice',t.id),'button primary')+'</article></aside></div>';
}
const examTypes = ['期中题型','期末题型'];
function questionSource(t,i) {return '元组自编 · '+(Number(year())-i)+' 年演示版 · '+examTypes[i]+'示例 · '+t.name;}
function practicePage(t,i) {
  if (!t) {
    const items=topics.flatMap(t=>t.questions.map((q,i)=>({t,q,i,y:String(Number(year())-i)}))).filter(({t,i,y})=>(filters.topic==='all'||filters.topic===t.id)&&(filters.year==='all'||filters.year===y)&&(filters.exam==='all'||filters.exam===String(i)));
    return heading('练习核对','按知识点、年份及题型查找练习，独立作答后查看解析。')+'<div class="panel toolbar">'+select('filter-topic','知识点',topicOptions,filters.topic)+select('filter-year','年份',[['all','全部年份'],[year(),year()+' 年演示版'],[Number(year())-1+'',Number(year())-1+' 年演示版']],filters.year)+select('filter-exam','题型',[['all','全部题型'],...examTypes.map((s,i)=>[''+i,s])],filters.exam)+'</div><div class="result-count">共 '+items.length+' 道示例题</div><div class="question-list">'+(items.map(({t,q,i})=>'<article class="panel question-row"><div><div class="eyeline">'+t.name+'</div><h3>'+link(q[0],ref('practice',t.id,i),'title-link')+'</h3><small>'+questionSource(t,i)+'</small></div>'+link('做题 '+icon('arrow'),ref('practice',t.id,i),'button')+'</article>').join('')||'<div class="empty">当前筛选下没有练习题。</div>')+'</div>';
  }
  i=t.questions[i]?i:0;
  const q=t.questions[i], key=t.id+'/'+i, answer=data.answers[key], submitted=Number.isInteger(answer), correct=answer===q[2];
  const note=data.notes[key];
  return heading('同类练习',t.name,'课程目录')+'<div class="detail-grid"><article class="panel lesson"><div class="eyeline">'+meta(t)+' · 第 '+(i+1)+' / '+t.questions.length+' 题</div><h2>'+q[0]+'</h2><div class="source">'+questionSource(t,i)+' · 题号 '+t.id+'-'+(i+1)+'</div><form id="answer" data-id="'+t.id+'" data-index="'+i+'"><fieldset '+(submitted?'disabled':'')+'><legend class="sr">请选择答案</legend>'+q[1].map((s,j)=>'<label class="option '+(submitted&&j===q[2]?'correct':'')+' '+(submitted&&j===answer&&!correct?'incorrect':'')+'"><input required type="radio" name="answer" value="'+j+'" '+(answer===j?'checked':'')+'><span>'+String.fromCharCode(65+j)+'.</span> '+s+'</label>').join('')+'</fieldset>'+(submitted?'':'<button class="button primary" type="submit">提交并查看解析 '+icon('arrow')+'</button>')+'</form>'+(submitted?'<div class="feedback '+(correct?'correct':'incorrect')+'"><strong>'+(correct?'回答正确':'再核对一下解题思路')+'</strong><p>正确答案：'+q[1][q[2]]+'</p><p>'+q[3]+'</p>'+link('回看知识点讲解 '+icon('arrow'),ref('learn',t.id),'text-link')+'</div><div class="actions">'+btn('重做本题','redo','data-key="'+key+'"')+link('练习同类题 '+icon('arrow'),ref('practice',t.id,i===0?1:0))+'</div>':'')+'</article><aside><article class="panel"><h2>错题笔记</h2><p>记录卡点或错因，复习时可回到本题与对应讲解。</p><form id="note" data-id="'+t.id+'" data-index="'+i+'"><label for="note-text" class="sr">错题笔记</label><textarea id="note-text" required maxlength="1500" placeholder="我在哪一步卡住了？">'+esc(note?.text||'')+'</textarea><button class="button primary" type="submit">保存笔记</button></form>'+ (note?btn('删除笔记','delete-note','data-key="'+key+'"','text-button'):'')+'</article><article class="panel next"><h2>对应讲解</h2>'+link('查看 '+t.name,ref('learn',t.id),'text-link')+'</article></aside></div>';
}
function recordsPage() {
  const tabs=[['saved','我的收藏'],['notes','错题笔记'],['history','学习历史']];
  const items=recordTab==='history'?data.history:Object.entries(data[recordTab]).map(([key,item])=>({...item,key})).reverse();
  const displayed=items.filter(item=>recordTopic==='all'||item.id===recordTopic);
  return heading('个人记录','找回收藏、错因和上次学习位置。记录保存在当前浏览器。')+'<div class="panel toolbar"><div class="filter-bar">'+tabs.map(([v,label])=>btn(label,'record-tab','data-value="'+v+'"','chip '+(v===recordTab?'on':''))).join('')+'</div>'+select('record-topic','知识点',topicOptions,recordTopic)+'</div><div class="question-list">'+(displayed.map(item=>{
    const t=getTopic(item.id);
    if (!t) return '';
    const note=recordTab==='notes';
    return '<article class="panel question-row"><div><div class="eyeline">'+t.name+(item.date?' · '+new Date(item.date).toLocaleString('zh-CN',{dateStyle:'short',timeStyle:'short'}):'')+'</div><h3>'+esc(item.label)+'</h3>'+(note?'<p class="note-copy">'+esc(item.text)+'</p>':'')+'</div><div class="actions">'+(item.resource?btn(recordTab==='history'?'从上次位置继续':'打开资源','resource','data-id="'+t.id+'" data-kind="'+item.resource.kind+'" data-position="'+item.resource.position+'"'):link(note?'重练并更新':'继续查看',item.link))+ (note?link('对应讲解',ref('learn',t.id)):'')+(recordTab==='saved'?btn('取消收藏','remove-saved','data-key="'+item.key+'"','text-button'):'')+'</div></article>';
  }).join('')||'<div class="empty">'+({saved:'收藏知识点或课程资源后，可在这里找回。',notes:'做题时保存的错因和个人笔记会显示在这里。',history:'查看讲解或开始练习后，可在这里继续学习。'})[recordTab]+'</div>')+'</div>';
}
function render() {
  const {section,id,index} = page(), t=getTopic(id);
  $('nav').innerHTML=Object.entries(pages).map(([key,[name,i]])=>'<a href="#'+key+'" '+(key===section?'aria-current="page"':'')+'>'+icon(i)+name+'</a>').join('');
  $('main').innerHTML={course:coursePage,learn:()=>learnPage(t),practice:()=>practicePage(t,index),records:recordsPage}[section]();
  if(section==='course') {updateCourse();drawGraph();}
}
function drawGraph() {
  const canvas=$('graph');
  if(!canvas) return;
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=window.devicePixelRatio||1;
  if(!w||!h) return;
  canvas.width=w*dpr;canvas.height=h*dpr;
  const c=canvas.getContext('2d');
  c.scale(dpr,dpr);
  const left=26,right=w-9,top=9,bottom=h-24;
  const x=v=>left+(right-left)*(v+4)/8,y=v=>bottom-(bottom-top)*v/.44;
  c.font='10px system-ui';c.fillStyle='#5d7191';c.strokeStyle='#dbe5f5';c.lineWidth=1;
  for(let i=0;i<=4;i++){const n=i/10;c.beginPath();c.moveTo(left,y(n));c.lineTo(right,y(n));c.stroke();c.fillText(n.toFixed(1),1,y(n)+3);}
  for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(x(i),top);c.lineTo(x(i),bottom);c.stroke();if(i%2===0)c.fillText(String(i),x(i)-4,bottom+17);}
  const curve=()=>{for(let i=0;i<=160;i++){const v=-4+i/20;const px=x(v),py=y(Math.exp(-v*v/2)/Math.sqrt(2*Math.PI));if(i===0)c.moveTo(px,py);else c.lineTo(px,py);}};
  const gradient=c.createLinearGradient(0,top,0,bottom);gradient.addColorStop(0,'#98b6fc');gradient.addColorStop(1,'#e9f0ff');
  c.beginPath();curve();c.lineTo(right,bottom);c.lineTo(left,bottom);c.closePath();c.fillStyle=gradient;c.fill();
  c.beginPath();curve();c.strokeStyle='#315bd9';c.lineWidth=2.6;c.stroke();
  c.setLineDash([4,4]);c.beginPath();c.moveTo(x(0),y(.399));c.lineTo(x(0),bottom);c.strokeStyle='#7490dc';c.lineWidth=1;c.stroke();c.setLineDash([]);
  c.beginPath();c.arc(x(0),y(.399),5,0,Math.PI*2);c.fillStyle='#f59a4f';c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();
}
function openDialog(content) {
  const modal=$('modal');
  $('modal-content').innerHTML='<button class="close" aria-label="关闭弹窗" data-action="close">×</button>'+content;
  if (!modal.open) {lastFocus=document.activeElement;modal.showModal();}
}
function resourcePosition(kind,position) {
  const {t,r}=activeResource;
  activeResource.position=position;
  if(kind==='replay') replaySeconds=position;
  remember('learn',t,0,{kind,label:t.name+' · '+r.name,position});
  updateResource();
}
function updateResource() {
  const {t,r,position}=activeResource;
  const chapters=['概念与公式','适用条件','分步例题'];
  const parts=[t.rule,t.condition,t.steps.join(' ')];
  const pane=$('resource-pane');
  if(r.id==='slides') {
    pane.innerHTML='<div class="slide"><small>第 '+(position+1)+' 页 / 3</small><h3>'+chapters[position]+'</h3><p>'+parts[position]+'</p></div><div class="actions">'+chapters.map((s,i)=>btn('第 '+(i+1)+' 页','position','data-position="'+i+'"','chip '+(i===position?'on':''))).join('')+'</div>';
  } else if(r.id==='replay') {
    const index=Math.min(2,Math.floor(replaySeconds/18));
    const focusId=document.activeElement?.id;const focusedButton=document.activeElement?.dataset.action;const focusedPosition=document.activeElement?.dataset.position;
    pane.innerHTML='<div class="slide video"><small>'+time(replaySeconds)+' / 00:54 · 定时讲解演示</small><h3>'+chapters[index]+'</h3><p>'+parts[index]+'</p></div><div class="replay-controls">'+btn(replayTimer?'暂停':'播放','play','','button primary')+'<input id="seek" type="range" min="0" max="54" value="'+replaySeconds+'" aria-label="回放进度"><span>'+time(replaySeconds)+'</span></div><div class="actions">'+chapters.map((s,i)=>btn(time(i*18)+' '+s,'position','data-position="'+i*18+'"','chip '+(i===index?'on':''))).join('')+'</div>';
    if(focusId==='seek') document.getElementById('seek').focus({preventScroll:true});if(focusedButton==='play') pane.querySelector('[data-action=play]').focus({preventScroll:true});if(focusedButton==='position') pane.querySelector('[data-position="'+focusedPosition+'"]').focus({preventScroll:true});
  } else {
    pane.innerHTML='<div class="slide"><small>第 '+t.ch+' 章 · '+t.group+'</small><h3>'+chapters[position]+'</h3><p>'+parts[position]+'</p></div><div class="actions">'+chapters.map((s,i)=>btn(s,'position','data-position="'+i+'"','chip '+(i===position?'on':''))).join('')+'</div>';
  }
}
function showResource(id,kind,position=0) {
  const t=getTopic(id),r=resources.find(r=>r.id===kind);
  if(!t||!r) return;
  clearInterval(replayTimer);replayTimer=undefined;
  const key=kind+'/'+id,label=t.name+' · '+r.name;
  activeResource={t,r,position};
  openDialog('<div class="eyeline">'+meta(t)+'</div><h2>'+r.name+'</h2><p>'+t.name+'</p>'+source(r.meta,t)+'<div id="resource-pane"></div><div class="actions">'+bookmarks(key,id,label,kind)+link('知识点讲解 '+icon('arrow'),ref('learn',id))+'</div>');
  resourcePosition(kind,position);
}
function toggleReplay() {
  if(replayTimer) {clearInterval(replayTimer);replayTimer=undefined;updateResource();return;}
  if(replaySeconds>=54) replaySeconds=0;
  replayTimer=setInterval(()=>{
    if(replaySeconds>=53) {clearInterval(replayTimer);replayTimer=undefined;}
    resourcePosition('replay',replaySeconds+1);
  },1000);
  updateResource();
}
function showScope() {
  openDialog('<div class="eyeline">课程范围</div><h2>北京大学《概率统计（B）》</h2><p>选择示例学期，查看该学期下的资源标注。</p>'+select('term-select','示例学期',termOptions.map(t=>[t,t+' · 示例学期']),data.term)+'<h3>教学范围</h3><ol class="scope-list">'+chapterNames.map(([i,name])=>'<li>'+name+'</li>').join('')+'</ol><p class="source">章节与周次为演示安排。课件、回放、教材导读和试题均为元组自编示例。</p>');
}
function route() {
  const modal=$('modal');
  if(modal.open) modal.close();
  const {section,id,index}=page(), t=getTopic(id);
  if(t && (section==='learn'||section==='practice')) remember(section,t,t.questions[index]?index:0);
  render();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
window.addEventListener('resize',drawGraph);
$('modal').addEventListener('close',()=>{
  clearInterval(replayTimer);replayTimer=undefined;activeResource=undefined;
  if(lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
});
$('modal').addEventListener('click',e=>{if(e.target===$('modal')) $('modal').close();});
document.addEventListener('click',e=>{
  if(e.target.closest('#modal a')) $('modal').close();
  const button=e.target.closest('[data-action]');
  if(!button) return;
  const {action,value,id,kind,position,key,label}=button.dataset;
  switch(action) {
    case 'scope':showScope();break;
    case 'close':$('modal').close();break;
    case 'browse':$('catalog').scrollIntoView({behavior:'smooth'});$('query').focus({preventScroll:true});break;
    case 'order':
      course.order=value;course.group='all';
      document.querySelectorAll('.switch-btn').forEach(b=>b.classList.toggle('on',b.dataset.value===value));
      updateCourse();break;
    case 'group':course.group=value;updateCourse();break;
    case 'type':course.type=value;updateCourse();break;
    case 'resource':showResource(id,kind,Number(position)||0);break;
    case 'position':resourcePosition(activeResource.r.id,Number(position));break;
    case 'play':toggleReplay();break;
    case 'bookmark':{
      const exists=Boolean(data.saved[key]);
      if(exists) delete data.saved[key];
      else data.saved[key]={id,label,link:ref('learn',id),date:Date.now(),resource:kind?{kind,position:activeResource?.position||0}:null};
      if(save()) tell(exists?'已取消收藏':'已加入收藏');
      button.classList.toggle('selected',!exists);
      button.setAttribute('aria-pressed',!exists);
      button.innerHTML=icon('bookmark')+(exists?'收藏':'已收藏');
      break;
    }
    case 'redo':delete data.answers[key];save();render();$('answer').querySelector('input').focus({preventScroll:true});break;
    case 'record-tab':recordTab=value;render();break;
    case 'remove-saved':delete data.saved[key];save();render();break;
    case 'delete-note':delete data.notes[key];if(save()) tell('已删除笔记');render();break;
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='query') {course.query=e.target.value;updateCourse();}
});
document.addEventListener('change',e=>{
  const {id,value}=e.target;
  if(id==='term-select'){data.term=value;filters.year='all';save();render();}
  if(id==='seek') resourcePosition('replay',Number(value));
  if(id.startsWith('filter-')) {filters[id.slice(7)]=value;render();$(id).focus();}
  if(id==='record-topic'){recordTopic=value;render();$(id).focus();}
});
document.addEventListener('submit',e=>{
  const form=e.target;
  if(!['search','answer','note'].includes(form.id)) return;
  e.preventDefault();
  if(form.id==='search'){course.query=$('query').value;updateCourse();return;}
  const t=getTopic(form.dataset.id),i=Number(form.dataset.index),key=t.id+'/'+i;
  if(form.id==='answer'){
    const raw=new FormData(form).get('answer');
    if(raw===null) return;
    const draft=document.getElementById("note-text").value;data.answers[key]=Number(raw);save();render();document.getElementById("note-text").value=draft;
    const feedback=document.querySelector('.feedback');
    feedback.setAttribute('tabindex','-1');feedback.focus({preventScroll:true});return;
  }
  const note=$('note-text').value.trim();
  if(!note){tell('请先填写错因或学习笔记');return;}
  data.notes[key]={id:t.id,label:t.questions[i][0],text:note,link:ref('practice',t.id,i),date:Date.now()};
  if(save()) tell('已保存笔记与对应讲解');
  render();
});
route();


