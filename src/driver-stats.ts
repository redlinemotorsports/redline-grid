/* Driver Statistics — migrated from the legacy application without changing its UI. */
const legacy = window.RedlineLegacy;
if (!legacy) {
  throw new Error("Redline Grid compatibility bridge is unavailable.");
}
const $ = (id: string): HTMLElement | null => legacy.getElementById(id);

/* ---------- Driver Stats / offline-friendly head-to-head ---------- */
const statsState: Record<string, any> = {year:nowY,view:"directory",profile:null,a:null,b:null,data:null,loading:false,offline:false,cacheKey:y=>"redline-driver-stats-v1-"+y};
function statsEsc(v: any): string {return legacy.esc(v)}
function statsNum(v: any): number | null {if(v===null||v===undefined||v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null}
function statsDriverId(d: any): string {return d?.Driver?.driverId||d?.driverId||""}
function statsName(d: any): string {const x=d?.Driver||d;return [x?.givenName,x?.familyName].filter(Boolean).join(" ")||x?.name||x?.driverId||"Unknown driver"}
function statsTeam(d: any): string {return d?.Constructors?.[0]?.name||d?.team||""}
function statsColor(team: string, index: number): string {return legacy.teamIconColor(team)||(["FF1E00","3987E8","19A58C","E7B94D"][index%4])}
function statsReadCache(y: number): any {try{const x=JSON.parse(localStorage.getItem(statsState.cacheKey(y))||"null");return x&&Array.isArray(x.drivers)?x:null}catch(e){return null}}
function statsSaveCache(y: number, data: any): void {try{localStorage.setItem(statsState.cacheKey(y),JSON.stringify(data))}catch(e){}}
async function statsEndpoint(path: string): Promise<any> { return legacy.jget(path); }
function statsMerge(year: number, standingData: any, raceData: any, qualData: any, prior: any): any {
 const by: Record<string, any> = {};(prior?.drivers||[]).forEach(d=>{by[d.id]={...d}});
 const standings=standingData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings||[];
 standings.forEach((v,i)=>{const id=statsDriverId(v);if(!id)return;const d=by[id]||{id};d.name=statsName(v);d.code=v.Driver?.code||"";d.number=v.Driver?.permanentNumber||"";d.team=statsTeam(v);d.points=statsNum(v.points);d.wins=statsNum(v.wins);d.position=statsNum(v.position)||i+1;d.championshipAvailable=true;by[id]=d});
 Object.values(by).forEach(d=>{d.podiums=0;d.poles=0;d.fastest=0;d.retirements=0;d.finishSum=0;d.finishCount=0;d.roundPoints={};d.roundResults={};d.roundQualifying={}});
 const seasonRaces=(raceData?.RaceTable?.Races||[]).map(r=>({round:Number(r.round),name:r.raceName||("Round "+r.round),circuit:r.Circuit?.circuitName||""})).sort((a,b)=>a.round-b.round);
 if(raceData){
  const races=raceData.RaceTable?.Races||[];
  races.forEach(r=>{(r.Results||[]).forEach(v=>{const id=statsDriverId(v);if(!by[id])by[id]={id,name:statsName(v),team:statsTeam(v),points:null,wins:null,position:null,podiums:0,poles:0,fastest:0,retirements:0,finishSum:0,finishCount:0,roundPoints:{},roundResults:{},roundQualifying:{}};const d=by[id],pos=statsNum(v.position),status=String(v.status||"").trim().toLowerCase(),classified=/^finished$|^\+\d+\s+laps?$/.test(status),excluded=/disqualif|did not start|did not qualify|withdraw|excluded|107% rule/.test(status);if(status&&!classified&&!excluded)d.retirements=(d.retirements||0)+1;if(pos&&pos<=3)d.podiums++;if(pos){d.finishSum+=pos;d.finishCount++}const round=Number(r.round);d.roundPoints[round]=(d.roundPoints[round]||0)+(statsNum(v.points)||0);d.roundResults[round]={position:pos&&(!status||classified)?pos:null,status:String(v.status||"")};if(v.FastestLap?.rank==="1"||Number(v.FastestLap?.rank)===1)d.fastest++})});
 }
 if(qualData){
  const races=qualData.RaceTable?.Races||[];
  races.forEach(r=>(r.QualifyingResults||[]).forEach(v=>{const id=statsDriverId(v);if(!by[id])by[id]={id,name:statsName(v),team:statsTeam(v),points:null,wins:null,podiums:0,poles:0,fastest:0,finishSum:0,finishCount:0,roundPoints:{},roundResults:{},roundQualifying:{}};const d=by[id],pos=statsNum(v.position);if(pos===1)d.poles=(d.poles||0)+1;if(pos){d.qualSum=(d.qualSum||0)+pos;d.qualCount=(d.qualCount||0)+1;d.roundQualifying[Number(r.round)]=pos}}));
 }
 const drivers=Object.values(by).sort((a,b)=>(a.position||999)-(b.position||999));
 drivers.forEach(d=>{d.avgFinish=d.finishCount?Math.round(d.finishSum/d.finishCount*10)/10:null;d.avgQual=d.qualCount?Math.round(d.qualSum/d.qualCount*10)/10:null;d.podiums=Number.isFinite(d.podiums)?d.podiums:null;d.poles=Number.isFinite(d.poles)?d.poles:null;d.fastest=Number.isFinite(d.fastest)?d.fastest:null;d.roundPoints=d.roundPoints||{};d.roundResults=d.roundResults||{};d.roundQualifying=d.roundQualifying||{}});
 return {year,updatedAt:Date.now(),source:"jolpica",drivers,rounds:seasonRaces,hasRaces:!!raceData,hasQualifying:!!qualData};
}
function statsMetric(label: string, key: string, a: any, b: any, lowerBetter = false): string {
 const av=statsNum(a[key]),bv=statsNum(b[key]),max=Math.max(av||0,bv||0,1);
 const display=v=>v===null?"—":(key.startsWith("avg")?v.toFixed(1):v);
 const winner=av===null||bv===null||av===bv?"":(lowerBetter?(av<bv?a.name:b.name):(av>bv?a.name:b.name));
 return `<div class="stats-metric"><div class="stats-metric-head"><span>${label}</span><b>${winner?statsEsc(winner)+" leads":av===null||bv===null?"Data unavailable":av===bv?"Level":display(av)+" vs "+display(bv)}</b></div><div class="stats-dual"><div class="stats-barline"><b>${display(av)}</b><div class="stats-track"><div class="stats-fill a" style="width:${av===null?0:Math.max(0,av/max*100)}%"></div></div></div><div class="stats-barline"><b>${display(bv)}</b><div class="stats-track"><div class="stats-fill b" style="width:${bv===null?0:Math.max(0,bv/max*100)}%"></div></div></div></div></div>`;
}
function statsSummary(a: any, b: any): { headline: string; paragraph: string } {
 const ptsA=statsNum(a.points),ptsB=statsNum(b.points),winsA=statsNum(a.wins),winsB=statsNum(b.wins),fastA=statsNum(a.fastest),fastB=statsNum(b.fastest);
 let headline="A comparison still taking shape",paragraph="There isn't enough comparable data to call an overall advantage yet. Check the individual metrics below; unavailable values are left blank rather than treated as zero.";
 if(ptsA!==null&&ptsB!==null){
  const lead=ptsA===ptsB?0:(ptsA>ptsB?1:-1),winner=lead===0?"Neither driver leads on championship points":(lead>0?a.name:b.name)+" leads by "+Math.abs(ptsA-ptsB)+" championship points";
  headline=lead===0?"Level on championship points":(lead>0?a.name:b.name)+" leads the championship battle";
  paragraph=winner+". ";
  if(winsA!==null&&winsB!==null)paragraph+=(winsA===winsB?"Both drivers have "+winsA+" race wins.":(winsA>winsB?a.name:b.name)+" has "+Math.abs(winsA-winsB)+" more race "+(Math.abs(winsA-winsB)===1?"win":"wins")+".")+" ";
  if(fastA!==null&&fastB!==null)paragraph+=(fastA===fastB?"They are level on fastest laps.":(fastA>fastB?a.name:b.name)+" leads the fastest-lap count.")+" ";
  paragraph+="These figures describe the selected season's recorded results; they don't, by themselves, establish who is the faster driver in every condition.";
 }
 return {headline,paragraph};
}
function statsTrendSVG(data: any): string {
 const drivers=[...data.drivers].sort((a,b)=>(a.position||999)-(b.position||999));
 const rounds=(data.rounds?.length?data.rounds:Array.from(new Set(drivers.flatMap(d=>Object.keys(d.roundPoints||{}).map(Number)))).sort((a,b)=>a-b).map(round=>({round,name:"Round "+round})));
 if(rounds.length<2)return '<div class="stats-empty">Season-wide analysis will appear when at least two race results are available.</div>';
 const palette=["#FF1E00","#3987E8","#19A58C","#B17AE0","#D9A441","#42A5B5","#D66B91","#87964B","#8A7DCE","#D18A45","#4D9C6B","#B95F5F","#6D8EC7","#9B7B62","#55A6A0","#A76FA0","#7E8A96","#C28C39","#5B85A8","#9B9B55"];
 const series=drivers.map((d,index)=>{let total=0;const values=rounds.map(r=>{total+=Number(d.roundPoints?.[r.round]||0);return total});return {d,values,color:palette[index%palette.length]}});
 const max=Math.max(1,...series.flatMap(x=>x.values)),w=Math.max(700,rounds.length*36),h=270,l=42,r=12,t=20,b=32,iw=w-l-r,ih=h-t-b;
 const x=i=>l+(rounds.length===1?0:i*iw/(rounds.length-1)),y=v=>t+ih-(v/max)*ih;
 const grid=[0,.25,.5,.75,1].map(f=>{const v=max*f,yy=y(v);return `<line x1="${l}" y1="${yy}" x2="${w-r}" y2="${yy}" stroke="currentColor" opacity=".12"/><text x="${l-8}" y="${yy+3}" text-anchor="end" fill="currentColor" opacity=".65" font-size="10">${Math.round(v)}</text>`}).join("");
 const lines=series.map(z=>`<path d="${z.values.map((v,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(v).toFixed(1)).join(" ")}" stroke="${z.color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"><title>${statsEsc(z.d.name)}: ${z.values[z.values.length-1]} points</title></path>`).join("");
 const ticks=rounds.map((round,i)=>i===0||i===rounds.length-1||i%Math.ceil(rounds.length/10)===0?`<text x="${x(i)}" y="${h-10}" text-anchor="middle" fill="currentColor" opacity=".7" font-size="10">R${round.round}</text>`:"").join("");
 const legend=series.map(z=>`<span><i style="background:${z.color}"></i>${statsEsc(z.d.name)}</span>`).join("");
 const comparison=drivers.map(d=>{const paired=rounds.map(r=>({qual:statsNum(d.roundQualifying?.[r.round]),finish:statsNum(d.roundResults?.[r.round]?.position)})).filter(x=>x.qual!==null&&x.finish!==null);return {d,qual:paired.length?paired.reduce((sum,x)=>sum+x.qual,0)/paired.length:null,finish:paired.length?paired.reduce((sum,x)=>sum+x.finish,0)/paired.length:null,count:paired.length}}).filter(x=>x.qual!==null&&x.finish!==null).sort((a,b)=>a.qual-b.qual);
 const maxGridPosition=Math.max(20,...comparison.flatMap(x=>[x.qual,x.finish]));
 const positionChart=comparison.map((x,i)=>{const q=Math.max(0,Math.min(100,(x.qual/maxGridPosition)*100)),f=Math.max(0,Math.min(100,(x.finish/maxGridPosition)*100));return `<div class="stats-qf-row"><div class="stats-qf-name"><span>${statsEsc(x.d.name)}</span><small>${statsEsc(x.d.team||"")}</small></div><div class="stats-qf-bars"><div class="stats-qf-line"><span>QUAL</span><div class="stats-qf-track"><i style="width:${q}%;background:#3987E8"></i></div><b>P${x.qual.toFixed(1)}</b></div><div class="stats-qf-line"><span>FINISH</span><div class="stats-qf-track"><i style="width:${f}%;background:#19A58C"></i></div><b>P${x.finish.toFixed(1)}</b></div></div><div class="stats-qf-delta ${x.qual-x.finish>0?"gain":x.qual-x.finish<0?"loss":""}">${x.qual===x.finish?"—":(x.qual-x.finish>0?"+":"")+(x.qual-x.finish).toFixed(1)}</div></div>`}).join("");
 const performance=drivers.map(d=>{const paired=rounds.map(r=>{const q=statsNum(d.roundQualifying?.[r.round]),f=statsNum(d.roundResults?.[r.round]?.position);return q!==null&&f!==null?{round:r,qual:q,finish:f,gain:q-f}:null}).filter(Boolean);return {d,paired,avg:paired.length?paired.reduce((sum,x)=>sum+x.gain,0)/paired.length:null,gained:paired.filter(x=>x.gain>0).length,lost:paired.filter(x=>x.gain<0).length,same:paired.filter(x=>x.gain===0).length}}).filter(x=>x.avg!==null).sort((a,b)=>b.avg-a.avg);
 const gainRows=performance.map((x,i)=>`<div class="stats-gain-row"><span class="stats-gain-rank">${String(i+1).padStart(2,"0")}</span><span class="stats-gain-driver">${statsEsc(x.d.name)}<small>${x.paired.length} matched GP weekends</small></span><b class="${x.avg>0?"gain":x.avg<0?"loss":""}">${x.avg>0?"+":""}${x.avg.toFixed(1)} <small>PLACES</small></b><span class="stats-gain-record"><i>${x.gained} gained</i><i>${x.lost} lost</i></span></div>`).join("");
 const drives=performance.flatMap(x=>x.paired.map(p=>({...p,d:x.d})));
 const best=[...drives].sort((a,b)=>b.gain-a.gain||a.finish-b.finish).filter(x=>x.gain>0).slice(0,5);
 const worst=[...drives].sort((a,b)=>a.gain-b.gain||b.finish-a.finish).filter(x=>x.gain<0).slice(0,5);
 const driveRows=(items,kind)=>items.map(x=>`<div class="stats-drive-row"><span class="stats-drive-round">R${x.round.round}<small>${statsEsc(x.round.name.replace(/ Grand Prix$/," GP"))}</small></span><span class="stats-drive-driver">${statsEsc(x.d.name)}</span><span class="stats-drive-positions">Q P${x.qual} → P${x.finish}</span><b class="${kind}">${x.gain>0?"+":""}${x.gain}</b></div>`).join("");
 const recovery=`<div class="stats-recovery-grid"><section class="stats-analysis-panel"><h4>Biggest gains</h4><p class="stats-note">Largest improvements from qualifying to classified finish.</p>${best.length?driveRows(best,"gain"):'<div class="stats-empty">No qualifying-to-finish gains recorded yet.</div>'}</section><section class="stats-analysis-panel"><h4>Biggest drops</h4><p class="stats-note">Largest position losses from qualifying to classified finish.</p>${worst.length?driveRows(worst,"loss"):'<div class="stats-empty">No qualifying-to-finish drops recorded yet.</div>'}</section></div>`;
 const positionBreakdown=`<section class="stats-performance"><div class="stats-points-heading"><div><h3 class="stats-section-title">Average qualifying vs race finish</h3><p class="stats-note">Average positions for each driver. Lower position numbers are better; only available averages are shown.</p></div><span class="stats-points-count">${comparison.length} DRIVERS</span></div><div class="stats-qf-legend"><span><i style="background:#3987E8"></i>Qualifying</span><span><i style="background:#19A58C"></i>Race finish</span><span class="stats-note">Position gain = qualifying position − finishing position</span></div>${comparison.length?positionChart:'<div class="stats-empty">Qualifying and finishing averages are not both available.</div>'}</section>`;
 const gainBreakdown=`<section class="stats-performance"><div class="stats-points-heading"><div><h3 class="stats-section-title">Position gain leaderboard</h3><p class="stats-note">Average places gained or lost across rounds with both a qualifying position and a classified finish.</p></div><span class="stats-points-count">${performance.length} DRIVERS</span></div>${gainRows||'<div class="stats-empty">Matched qualifying and race results are not available yet.</div>'}</section>`;
 return `<div class="stats-chart-scroll"><svg class="stats-trend stats-season-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Cumulative championship points for all drivers by round">${grid}${lines}${ticks}</svg></div><div class="stats-trend-legend">${legend}</div><div class="stats-performance-heading"><span class="stats-kicker">RACE EXECUTION</span><h3 class="stats-section-title">Qualifying vs race performance</h3><p class="stats-note">Compare one-lap starting performance with classified Grand Prix finishes. Sprint sessions and sprint results are excluded.</p></div>${positionBreakdown}${gainBreakdown}${recovery}`;
}
function statsOptions(selected: any, other: any): string {return statsState.data.drivers.filter(d=>d.id!==other).map(d=>`<option value="${statsEsc(d.id)}" ${d.id===selected?"selected":""}>${statsEsc(d.name)}</option>`).join("")}
function statsDriverCard(d: any, side: "a" | "b", other: any): string {
 const color=side==="a"?"#FF1E00":"#3987E8";
 return `<div class="stats-driver ${side}"><div class="stats-kicker" style="color:${color}">DRIVER ${side.toUpperCase()}</div><select class="stats-select" data-driver-select="${side}" aria-label="Select Driver ${side.toUpperCase()}">${statsOptions(d.id,other)}</select><div class="stats-team">${statsEsc(d.team||"Team data unavailable")}</div><div class="stats-points">${d.points===null||d.points===undefined?"—":statsEsc(d.points)}<small>PTS</small></div></div>`;
}
function statsDriverSpotlight(d: any): { label: string; intro: string } {
 const name=String(d.name||"").toLowerCase();
 const profiles: Array<[RegExp, string]> = [
  [/max verstappen|verstappen/,"A relentless racer with a reputation for precision, aggressive commitment and exceptional race pace. Watch how he turns qualifying speed into control over a full Grand Prix."],
  [/lando norris|norris/,"A naturally quick, attacking driver whose pace over one lap and growing racecraft make every weekend worth following. The key question is how consistently he can convert speed into results."],
  [/oscar piastri|piastri/,"Cool under pressure and notably composed in wheel-to-wheel battles, he has quickly established himself as a driver to watch. His consistency and decision-making are central to his story."],
  [/charles leclerc|leclerc/,"A high-speed qualifier with a sharp feel for a single lap, he can make the most of a narrow performance window. His profile is all about turning raw pace into complete race-weekend results."],
  [/lewis hamilton|hamilton/,"A multiple-time champion whose experience, race management and feel for changing conditions remain defining strengths. His weekends are especially interesting when strategy and tire life become decisive."],
  [/george russell|russell/,"A precise, technically minded racer who often brings strong qualifying pace and measured execution. His story is about maximizing the package and capitalizing when opportunities appear."],
  [/fernando alonso|alonso/,"One of the grid’s most experienced racers, known for tactical awareness, defensive craft and finding opportunities others miss. Strategy and race intelligence are always worth watching."],
  [/carlos sainz|sainz/,"A thoughtful, adaptable racer with a reputation for detailed preparation and strategic awareness. His ability to read a race and build a weekend makes consistency a key theme."],
  [/alexander albon|albon/,"A smooth and adaptable driver who can be particularly effective at managing tires and extracting performance from difficult weekends. Watch for strong recovery drives and opportunistic points."],
  [/pierre gasly|gasly/,"A committed qualifier with the ability to deliver standout results when the car and conditions come together. Converting that pace into reliable points is a recurring storyline."],
  [/esteban ocon|ocon/,"A tough, combative racer who is comfortable in close battles and fights hard for every position. Race execution and making the most of opportunities are central to his profile."],
  [/kimi antonelli|antonelli|andrea kimi/,"A young talent learning at the highest level, with each weekend offering a fresh measure of speed, composure and adaptation. Progress and consistency are the key things to track."],
  [/lance stroll|stroll/,"A driver with flashes of strong single-lap pace and experience across varied conditions. The focus is on building complete weekends and converting opportunities into points."],
  [/oliver bearman|bearman/,"An emerging talent gaining valuable experience against established names. His development, qualifying pace and ability to deliver clean race weekends make him one to keep an eye on."],
  [/nico hulkenberg|hülkenberg|hulkenberg/,"An experienced and capable qualifier who can deliver when the car is competitive. His ability to make the most of a weekend and seize unexpected opportunities is a key strength."],
  [/yuki tsunoda|tsunoda/,"An energetic, attacking driver whose speed and willingness to fight make him compelling to follow. Consistency and clean execution are important measures of his progress."],
  [/isack hadjar|hadjar/,"A young racer building his place on the grid, with every session offering clues about his adaptability and raw pace. Watch how quickly he turns potential into repeatable results."],
  [/gabriel bortoleto|bortoleto/,"A developing talent facing the challenge of translating junior-category promise into Formula 1 consistency. Qualifying progress and learning across a race weekend are key storylines."],
  [/liam lawson|lawson/,"An assertive racer who has shown he is willing to fight for position. The focus is on consistency, confidence and maximizing the points available each weekend."],
  [/valtteri bottas|bottas/,"A seasoned Grand Prix winner with strong qualifying instincts and extensive technical experience. His race pace and ability to help build a competitive weekend remain valuable assets."],
  [/sergio perez|perez/,"An experienced racer known for tire management and opportunistic racecraft. Strategy, long-run pace and making the most of changing circumstances are worth tracking."]
 ];
 const match=profiles.find(([pattern])=>pattern.test(name));
 const position=Number(d.position),points=Number(d.points);
 let label="DRIVER SPOTLIGHT";
 if(Number.isFinite(position)&&position>0&&position<=3)label="TITLE CONTENDER";
 else if(Number.isFinite(position)&&position>=4&&position<=10)label="POINTS BATTLE";
 let intro=match?match[1]:`Representing ${d.team||"their team"}, ${d.name||"this driver"} is part of the season’s evolving story. Follow the qualifying pace, race results and points progression below to see how their campaign develops.`;
 if(Number.isFinite(position)&&position>0&&Number.isFinite(points))intro+=` In the ${d.year||"current"} standings snapshot, ${d.name||"the driver"} sits P${position} on ${points} point${points===1?"":"s"}.`;
 return {label,intro};
}
function statsDriverBadge(d: any): string { return legacy.driverNoBadge(d.number || "—", statsColor(d.team, 0)); }
function statsProfileMarkup(d: any, data: any): string {
 const races=(data.rounds||[]).map(r=>({round:r.round,name:r.name,circuit:r.circuit,result:d.roundResults?.[r.round],qual:d.roundQualifying?.[r.round],points:d.roundPoints?.[r.round]})).filter(r=>r.result||r.qual!==undefined||r.points!==undefined).reverse();
 const metric=(label,value)=>`<article class="driver-hub-metric"><span>${label}</span><b>${value===null||value===undefined||value===""?"—":statsEsc(value)}</b></article>`;
 return `<div class="driver-profile-top"><div class="driver-profile-badge">${statsDriverBadge(d)}</div><div class="driver-profile-identity"><p class="stats-kicker">DRIVER PROFILE · ${data.year}</p><h3>${statsEsc(d.name)}</h3><p>${statsEsc(d.team||"Team not listed")}</p><span class="driver-profile-number">CAR NUMBER ${statsEsc(d.number||"—")}</span></div></div>
 ${(()=>{const spotlight=statsDriverSpotlight(d);return `<section class="driver-spotlight"><p class="stats-kicker">${spotlight.label}</p><h4>Driver Spotlight</h4><p>${statsEsc(spotlight.intro)}</p></section>`})()}
 <div class="driver-hub-metrics">${metric("Championship position",d.position?("P"+d.position):"—")}${metric("Points",d.points)}${metric("Wins",d.wins)}${metric("Podiums",d.podiums)}${metric("Pole positions",d.poles)}${metric("Fastest laps",d.fastest)}${metric("Avg. qualifying",d.avgQual===null||d.avgQual===undefined?null:d.avgQual.toFixed(1))}${metric("Avg. finish",d.avgFinish===null||d.avgFinish===undefined?null:d.avgFinish.toFixed(1))}</div>
 <div class="driver-profile-actions"><button type="button" data-driver-view="directory">← All drivers</button></div>
 <h3 class="stats-section-title">Season timeline</h3><p class="stats-note">Round-by-round results for ${data.year}. This is season data, not a complete career record.</p>
 ${races.length?`<div class="driver-race-list">${races.map(r=>`<article class="driver-race-row"><div class="driver-race-round">R${r.round}</div><div class="driver-race-name"><b>${statsEsc(r.name)}</b><small>${statsEsc(r.circuit||"Grand Prix")}</small></div><div class="driver-race-stats"><span>Q ${r.qual??"—"}</span><span>${r.result?.position?"P"+r.result.position:r.result?.status?statsEsc(r.result.status):"—"}</span><b>${r.points??0} pts</b></div></article>`).join("")}</div>`:'<div class="stats-empty">Round-by-round results are not available for this driver and season yet.</div>'}`;
}
function renderDriverStats(): void {
 const root=$("statsContent");if(!root)return;
 const data=statsState.data;
 if(!data?.drivers?.length){root.innerHTML='<div class="stats-empty">Driver statistics are not available yet. Connect to the internet and refresh when OpenF1 or Jolpica-F1 is reachable. Once loaded, Redline will save a local copy for future API outages.</div>';return}
 const drivers=data.drivers,defaultA=drivers[0],defaultB=drivers.find(d=>d.id!==defaultA?.id)||defaultA;
 if(!statsState.a||!drivers.some(d=>d.id===statsState.a))statsState.a=defaultA.id;
 if(!statsState.b||!drivers.some(d=>d.id===statsState.b)||statsState.b===statsState.a)statsState.b=defaultB.id;
 const a=drivers.find(d=>d.id===statsState.a)||defaultA,b=drivers.find(d=>d.id===statsState.b)||defaultB;
 const summary=statsSummary(a,b),stamp=data.updatedAt?new Date(data.updatedAt).toLocaleString():"Unknown";
 if(statsState.view==="directory"){
  root.innerHTML=`<div class="driver-directory-head"><div><h3 class="stats-section-title">Driver directory</h3><p class="stats-note">Select a driver to explore their season profile and performance.</p></div><label>Find a driver <input id="driverDirectorySearch" type="search" placeholder="Search name or team"></label></div><div class="driver-directory-grid">${drivers.map(d=>`<button type="button" class="driver-directory-card" data-driver-profile="${statsEsc(d.id)}" data-search="${statsEsc((d.name+" "+(d.team||"")).toLowerCase())}"><span class="driver-directory-badge">${statsDriverBadge(d)}</span><span class="driver-directory-info"><b>${statsEsc(d.name)}</b><small>${statsEsc(d.team||"Team not listed")}</small><span>${d.points===null||d.points===undefined?"—":statsEsc(d.points)+" pts"} · ${d.position?"P"+d.position:"Position —"}</span></span><span class="driver-directory-arrow">↗</span></button>`).join("")}</div><p class="stats-note">Season: ${data.year}. Driver number marks use the same graphic style as the Standings tab. ${statsState.offline?"Showing saved data from this device.":""}</p>`;
  const search = root.querySelector<HTMLInputElement>("#driverDirectorySearch");
  if (search) search.oninput = () => { const q = search.value.trim().toLowerCase(); root.querySelectorAll<HTMLElement>("[data-driver-profile]").forEach(card => { card.hidden = !(card.dataset.search || "").includes(q); }); };
  root.querySelectorAll<HTMLElement>("[data-driver-profile]").forEach(card => card.onclick = () => {statsState.profile=card.dataset.driverProfile;statsState.view="profile";renderDriverStats();document.querySelectorAll("[data-stats-view]").forEach(x=>x.setAttribute("aria-selected",String(x.dataset.statsView===statsState.view)))});
  return;
 }
 if(statsState.view==="profile"){
  const d=drivers.find(x=>x.id===statsState.profile)||a||drivers[0];statsState.profile=d.id;
  root.innerHTML='<div class="stats-body">'+statsProfileMarkup(d,data)+'</div>';
  const backButton = root.querySelector<HTMLElement>("[data-driver-view='directory']");
  if (backButton) backButton.onclick = () => {statsState.view="directory";renderDriverStats();document.querySelectorAll("[data-stats-view]").forEach(x=>x.setAttribute("aria-selected",String(x.dataset.statsView===statsState.view)))};
  return;
 }
 let html='<div class="stats-body">';
 if(statsState.view==="head"){
  html+=`<div class="stats-pair">${statsDriverCard(a,"a",b.id)}${statsDriverCard(b,"b",a.id)}</div><div class="stats-verdict"><div class="sv-kicker">▰ &nbsp; THE EDITORIAL VERDICT</div><h3>${statsEsc(summary.headline)}</h3><p>${statsEsc(summary.paragraph)}</p><div class="stats-meta"><span>◉ &nbsp; ${statsState.offline?"OFFLINE CACHE":data.hasRaces&&data.hasQualifying?"Race & qualifying data loaded":data.hasRaces?"Race data loaded":"Standings data available"} </span><span>${statsState.offline?"Last saved ":"Saved "}${statsEsc(stamp)}</span></div></div><div class="stats-lower"><div><h3 class="stats-section-title">The numbers behind the verdict</h3>${statsMetric("Championship points","points",a,b)}${statsMetric("Race wins","wins",a,b)}${statsMetric("Podiums","podiums",a,b)}${statsMetric("Pole","poles",a,b)}${statsMetric("Fastest laps","fastest",a,b)}${statsMetric("Average qualifying position","avgQual",a,b,true)}${statsMetric("Average finishing position","avgFinish",a,b,true)}</div><aside class="stats-side"><h3>At a glance</h3><div class="stats-takeaway"><span>↗</span><span><b>${statsEsc(a.name)}</b> — ${a.points!=null&&b.points!=null?(a.points===b.points?"level on points":a.points>b.points?"championship points advantage":"trails on championship points"):"points data unavailable"}</span></div><div class="stats-takeaway"><span>↗</span><span><b>${statsEsc(b.name)}</b> — ${b.fastest!=null&&a.fastest!=null&&b.fastest>a.fastest?"more fastest laps":b.wins!=null&&a.wins!=null&&b.wins>a.wins?"more race wins":"comparison depends on the selected metrics"}</span></div><div class="stats-takeaway"><span>◎</span><span>Missing statistics are shown as dashes, not zero.</span></div></aside></div><p class="stats-note">Summary is generated from recorded statistics only. Average qualifying and finishing positions are lower-is-better. Historical and cached data may be incomplete.</p>`;
 }else if(statsState.view==="overview"){
  const records: Array<[string, string, string, boolean]> = [
   ["Wins","wins","wins",false],
   ["Podiums","podiums","podiums",false],
   ["Retirements","retirements","retirements",false],
   ["Fastest laps","fastest","fastest laps",false],
   ["Avg. qualifying","avgQual","average grid position",true],
   ["Avg. finish","avgFinish","average finishing position",true]
  ];
  html+='<h3 class="stats-section-title">Season Record Book</h3><p class="stats-note" style="margin:0 0 14px">A neutral look at the season’s leading performances. Each category shows the top three recorded results, with ties included.</p><div class="stats-record-grid">'+records.map(([label,key,unit,lowerBetter])=>{
   const rows=drivers.map(d=>({d,value:statsNum(d[key])})).filter(x=>x.value!==null).sort((x,y)=>lowerBetter?x.value-y.value:y.value-x.value);
   if(!rows.length)return `<article class="stats-record"><div class="stats-record-label">${label}</div><div class="stats-record-value">—</div><div class="stats-record-leader">${"No data available"}</div><div class="stats-record-foot">${"Waiting for season results"}</div></article>`;
   const cutoff=rows[Math.min(2,rows.length-1)].value;
   const ranked=rows.filter(x=>lowerBetter?x.value<=cutoff:x.value>=cutoff);
   const best=rows[0].value;
   const value=key.startsWith("avg")?best.toFixed(1):String(best);
   return `<article class="stats-record"><div class="stats-record-label">${label}</div><div class="stats-record-value">${value}<span style="font:500 10px Inter;color:var(--mute);letter-spacing:0"> ${key.startsWith("avg")?"AVG":""}</span></div><div class="stats-record-ranking">${ranked.map((x,i)=>`<div class="stats-record-row"><span class="stats-record-rank">${i+1}</span><span class="stats-record-driver">${statsEsc(x.d.name)}</span><span class="stats-record-stat">${key.startsWith("avg")?x.value.toFixed(1):x.value}</span></div>`).join("")}</div><div class="stats-record-foot">${ranked.length>3?"Top three · ties included":lowerBetter?"Lower is better":"Season total"}${unit?" · "+unit:""}</div></article>`;
  }).join("")+'</div><p class="stats-note">All drivers use the same ranking rules. Average positions are calculated from recorded qualifying sessions or classified race finishes; missing data is excluded rather than counted as zero. Current-season records may change as more results become available.</p>';
 }else{
  const leader=[...drivers].sort((x,y)=>(y.points||0)-(x.points||0))[0];
  const wins=Math.max(0,...drivers.map(d=>Number(d.wins)||0)),winLeaders=drivers.filter(d=>wins>0&&Number(d.wins)===wins);
  const podiums=Math.max(0,...drivers.map(d=>Number(d.podiums)||0)),podiumLeaders=drivers.filter(d=>podiums>0&&Number(d.podiums)===podiums);
  const totalPoints=drivers.reduce((sum,d)=>sum+(Number(d.points)||0),0),roundCount=(data.rounds||[]).length;
  html+=`<div class="stats-trend-intro"><div><p class="stats-kicker">FULL-GRID ANALYSIS</p><h3 class="stats-section-title" style="margin-top:4px">Season Trends</h3><p class="stats-note" style="margin-top:0">Follow the championship across the entire grid, race by race. Every driver uses the same scale and visual treatment.</p></div><div class="stats-round-count">${roundCount}<small>RACES IN DATA</small></div></div><div class="stats-trend-summary"><article><span>Championship leader</span><b>${statsEsc(leader?.name||"—")}</b><small>${leader?.points??"—"} points</small></article><article><span>Most wins</span><b>${winLeaders.length?winLeaders.map(d=>statsEsc(d.name)).join(" / "):"—"}</b><small>${wins} wins</small></article><article><span>Most podiums</span><b>${podiumLeaders.length?podiumLeaders.map(d=>statsEsc(d.name)).join(" / "):"—"}</b><small>${podiums} podiums</small></article><article><span>Points awarded</span><b>${Math.round(totalPoints)}</b><small>Across listed drivers</small></article></div><h3 class="stats-section-title">Cumulative championship points</h3><p class="stats-note">Each line tracks a driver’s running points total after each round. Use the legend to identify drivers; scroll horizontally on smaller screens.</p>${statsTrendSVG(data)}<p class="stats-note">Data is based on available race results and championship standings. Sprint points are not included in this race-results feed, and the latest rounds may be incomplete until results are published.</p>`;
 }
 html+='</div>';root.innerHTML=html;
 root.querySelectorAll<HTMLSelectElement>("[data-driver-select]").forEach(sel => sel.onchange = () => { const side = sel.dataset.driverSelect; if (side === "a" || side === "b") statsState[side] = sel.value; renderDriverStats(); });
}
async function loadDriverStats(force = false): Promise<void> {
 const y = Number($("statsYear")?.value || statsState.year || legacy.nowY);statsState.year=y;
 const cached=statsReadCache(y);
 if(cached){statsState.data=cached;statsState.offline=false;renderDriverStats()}
 else {if(statsState.data?.year!==y)statsState.data=null;if(!statsState.data)$("statsContent").innerHTML='<div class="state">Loading driver statistics…</div>'}
 if(statsState.loading&&!force)return;
 statsState.loading=true;
 try{
  const [standingsResult,raceResult,qualResult]=await Promise.allSettled([
   statsEndpoint(`/${y}/driverstandings/`),
   statsEndpoint(`/${y}/results/`),
   statsEndpoint(`/${y}/qualifying/`)
  ]);
  const standingData=standingsResult.status==="fulfilled"?standingsResult.value:null;
  const raceData=raceResult.status==="fulfilled"?raceResult.value:null;
  const qualData=qualResult.status==="fulfilled"?qualResult.value:null;
  if(standingData||raceData||qualData){
   statsState.offline=false;
   const fresh=statsMerge(y,standingData,raceData,qualData,cached);
   if(fresh.drivers.length){statsState.data=fresh;statsSaveCache(y,fresh);renderDriverStats()}
   else if(!cached)throw new Error("No driver rows returned");
  }else if(!cached){throw new Error("Both F1 data providers are unavailable")}
 }catch(e){
  if(cached||statsState.data){statsState.offline=true;renderDriverStats()}
  if(!cached&&!statsState.data)$("statsContent").innerHTML='<div class="stats-empty">The F1 data APIs are unavailable and no saved driver stats exist for this season yet. Try again when online; Redline will cache successful data for later outages.</div>';
 }finally{statsState.loading=false}
}

initDriverStats();
void loadDriverStats();
