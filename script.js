// ARGOS multi-emergency prototype
let map, directionsService, directionsRenderer;
let incidents = []; // {id, title, pos, marker, selected, polylineList}
let vehicles = [];  // {id, pos, marker, available, routePolyline, routePoints, animIndex}
let selectedIncident = null;

// Predefined incidents (sample Recife coordinates)
const INCIDENTS_DATA = [
  {id:1, title:'Batida - Derby', pos:{lat:-8.0543,lng:-34.8790}, icon:'https://cdn-icons-png.flaticon.com/512/685/685352.png'},
  {id:2, title:'Incêndio - Boa Vista', pos:{lat:-8.0635,lng:-34.8830}, icon:'https://cdn-icons-png.flaticon.com/512/565/565547.png'},
  {id:3, title:'Assalto - Madalena', pos:{lat:-8.0562,lng:-34.9050}, icon:'https://cdn-icons-png.flaticon.com/512/482/482684.png'},
  {id:4, title:'Acidente - Pina', pos:{lat:-8.0730,lng:-34.8720}, icon:'https://cdn-icons-png.flaticon.com/512/864/864685.png'},
  {id:5, title:'Ferido - Casa Forte', pos:{lat:-8.0250,lng:-34.9370}, icon:'https://cdn-icons-png.flaticon.com/512/2991/2991102.png'}
];

// Predefined vehicle bases (5 vehicles) — always visible
const VEHICLE_BASES = [
  {id:1, name:'Unidade 11', pos:{lat:-8.0400,lng:-34.8800}},
  {id:2, name:'Unidade 22', pos:{lat:-8.0580,lng:-34.8700}},
  {id:3, name:'Unidade 33', pos:{lat:-8.0700,lng:-34.8900}},
  {id:4, name:'Unidade 44', pos:{lat:-8.0300,lng:-34.8600}},
  {id:5, name:'Unidade 55', pos:{lat:-8.0500,lng:-34.9200}}
];

function initMap(){
  map = new google.maps.Map(document.getElementById('map'), {center:{lat:-8.0543,lng:-34.8790},zoom:13});
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({suppressMarkers:true,map:map});

  // create incidents UI + markers
  const list = document.getElementById('incidentsList');
  INCIDENTS_DATA.forEach(it=>{
    const el = document.createElement('div'); el.className='incident-card'; el.id='inc-'+it.id;
    el.innerHTML = `<div class="incident-title">${it.title}</div><div class="small">${it.pos.lat.toFixed(4)}, ${it.pos.lng.toFixed(4)}</div>`;
    el.addEventListener('click', ()=>selectIncident(it.id));
    list.appendChild(el);

    const marker = new google.maps.Marker({position:it.pos,map:map,title:it.title,icon:{url:it.icon,scaledSize:new google.maps.Size(36,36)}});
    incidents.push({id:it.id,title:it.title,pos:it.pos,marker:marker,selected:false,polylines:[]});
  });

  // create vehicles UI + markers
  const vlist = document.getElementById('vehiclesList');
  VEHICLE_BASES.forEach(vb=>{
    const el = document.createElement('div'); el.className='vehicle-card'; el.id='veh-'+vb.id;
    el.innerHTML = `<div><strong>${vb.name}</strong></div><div class="small">${vb.pos.lat.toFixed(4)}, ${vb.pos.lng.toFixed(4)}</div>`;
    el.addEventListener('click', ()=>focusVehicle(vb.id));
    vlist.appendChild(el);

    const marker = new google.maps.Marker({position:vb.pos,map:map,title:vb.name,icon:{url:'https://cdn-icons-png.flaticon.com/512/854/854894.png',scaledSize:new google.maps.Size(36,36)}});
    vehicles.push({id:vb.id,name:vb.name,pos:vb.pos,marker:marker,available:true,routePolyline:null,routePoints:[],animIndex:0});
  });

  // camera click focus
  document.querySelector('.camera').addEventListener('click', ()=>{
    if(selectedIncident){
      map.panTo(selectedIncident.pos); map.setZoom(16);
    }
  });

  // dispatch button
  document.getElementById('dispatchBtn').addEventListener('click', ()=>{
    if(!selectedIncident){ alert('Selecione uma emergência na lista'); return; }
    const count = parseInt(document.getElementById('selectCount').value);
    dispatchToIncident(selectedIncident.id,count);
    document.getElementById('dispatchBtn').style.display='none';
  });

  // reset
  document.getElementById('resetBtn').addEventListener('click', ()=>location.reload());
}

function selectIncident(id){
  incidents.forEach(ic=>{
    const el = document.getElementById('inc-'+ic.id);
    if(ic.id===id){ ic.selected=true; el.classList.add('selected'); selectedIncident=ic; map.panTo(ic.pos); map.setZoom(15); }
    else { ic.selected=false; el.classList.remove('selected'); }
  });
  // show dispatch button again when selecting different incident
  document.getElementById('dispatchBtn').style.display='inline-block';
}

function dispatchToIncident(incidentId, count){
  const inc = incidents.find(i=>i.id===incidentId);
  if(!inc) return;

  // choose nearest available vehicles
  const available = vehicles.filter(v=>v.available);
  available.sort((a,b)=>distance(a.pos,inc.pos)-distance(b.pos,inc.pos));
  const chosen = available.slice(0,count);

  chosen.forEach((v, idx)=>{
    v.available=false;
    // compute route from vehicle current pos to incident
    directionsService.route({origin:v.pos,destination:inc.pos,travelMode:'DRIVING'}, (res,status)=>{
      if(status==='OK'){
        // draw polyline for this vehicle and store
        const routePath = res.routes[0].overview_path;
        const poly = new google.maps.Polyline({path:routePath,strokeColor:getColorForVehicle(v.id),strokeOpacity:0.9,strokeWeight:4,map:map});
        v.routePolyline=poly;
        v.routePoints = routePath;
        v.animIndex=0;
        animateVehicleAlongRoute(v);
      }
    });
  });
}

function animateVehicleAlongRoute(v){
  if(!v.routePoints || v.routePoints.length===0) return;
  const stepDelay = 300; // base delay (ms)
  const speedMultiplier = parseFloat(document.getElementById('selectCount') ? 1 : 1); // could read slider if added
  function step(){
    if(v.animIndex >= v.routePoints.length) { v.available=true; return; }
    const p = v.routePoints[v.animIndex];
    v.marker.setPosition(p);
    // highlight route if this vehicle is clicked (persist)
    v.animIndex++;
    setTimeout(step, stepDelay / speedMultiplier + Math.random()*120);
  }
  step();
}

function getColorForVehicle(id){
  const colors = ['#1976D2','#388E3C','#FBC02D','#E64A19','#7B1FA2'];
  return colors[(id-1)%colors.length];
}

function focusVehicle(id){
  const v = vehicles.find(x=>x.id===id);
  if(!v) return;
  map.panTo(v.marker.getPosition());
  map.setZoom(15);
  // highlight its polyline
  vehicles.forEach(veh=>{ if(veh.routePolyline) veh.routePolyline.setOptions({strokeWeight:4,strokeOpacity:0.35}); });
  if(v.routePolyline) v.routePolyline.setOptions({strokeWeight:6,strokeOpacity:1.0});
}

// simple euclidean approx for sorting (fine for short distances)
function distance(a,b){ const dx=a.lat-b.lat; const dy=a.lng-b.lng; return Math.sqrt(dx*dx+dy*dy); }
