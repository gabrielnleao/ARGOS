// -------------------------
// Dados de incidentes
// -------------------------
// Cada incidente tem seu próprio arquivo de ícone (na raiz do projeto)
const INCIDENTS_DATA = [
  {
    id: 1,
    title: "Acidente na Av. Agamenon",
    pos: { lat: -8.0505, lng: -34.8925 },
    icon: "inc_acidente.png",
  },
  {
    id: 2,
    title: "Incêndio em prédio residencial",
    pos: { lat: -8.045, lng: -34.885 },
    icon: "inc_incendio.png",
  },
  {
    id: 3,
    title: "Ocorrência de assalto",
    pos: { lat: -8.06, lng: -34.89 },
    icon: "inc_assalto.png",
  },
  {
    id: 4,
    title: "Congestionamento intenso",
    pos: { lat: -8.0435, lng: -34.878 },
    icon: "inc_congestionamento.png",
  },
  {
    id: 5,
    title: "Resgate e apoio médico",
    pos: { lat: -8.055, lng: -34.9 },
    icon: "inc_resgate.png",
  },
];

// -------------------------
// Bases de viaturas
// -------------------------
const VEHICLE_BASES = [
  {
    id: 11,
    name: "Unidade 11",
    pos: { lat: -8.04, lng: -34.888 },
  },
  {
    id: 22,
    name: "Unidade 22",
    pos: { lat: -8.058, lng: -34.887 },
  },
  {
    id: 33,
    name: "Unidade 33",
    pos: { lat: -8.07, lng: -34.889 },
  },
  {
    id: 44,
    name: "Unidade 44",
    pos: { lat: -8.03, lng: -34.886 },
  },
  {
    id: 55,
    name: "Unidade 55",
    pos: { lat: -8.05, lng: -34.892 },
  },
];

// -------------------------
// Variáveis globais
// -------------------------
let map;
let directionsService;
let incidents = [];
let vehicles = [];
let selectedIncident = null;

// -------------------------
// Inicialização do mapa
// -------------------------
function initMap() {
  const center = { lat: -8.05, lng: -34.89 }; // região central da maquete

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  directionsService = new google.maps.DirectionsService();

  buildIncidents();
  buildVehicles();
  setupControls();
}

// -------------------------
// Criação de incidentes
// -------------------------
function buildIncidents() {
  const list = document.getElementById("incidentsList");
  list.innerHTML = "";
  incidents = [];

  INCIDENTS_DATA.forEach((it) => {
    // Card na lateral
    const el = document.createElement("div");
    el.className = "incident-card";
    el.id = `inc-${it.id}`;
    el.innerHTML = `
      <div class="incident-title">${it.title}</div>
      <div class="small">${it.pos.lat.toFixed(4)}, ${it.pos.lng.toFixed(
      4
    )}</div>
    `;
    el.addEventListener("click", () => selectIncident(it.id));
    list.appendChild(el);

    // Ícone específico deste incidente
    const incidentIcon = {
      url: it.icon || "inc_default.png",
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 20),
    };

    // Marcador no mapa
    const marker = new google.maps.Marker({
      position: it.pos,
      map,
      title: it.title,
      icon: incidentIcon,
    });

    incidents.push({
      id: it.id,
      title: it.title,
      pos: it.pos,
      marker,
      selected: false,
      polylines: [],
    });
  });
}

// -------------------------
// Criação das viaturas
// -------------------------
function buildVehicles() {
  const list = document.getElementById("vehiclesList");
  list.innerHTML = "";
  vehicles = [];

  // Ícone único das viaturas (arquivo na raiz)
  const vehicleIcon = {
    url: "icon_viatura.png",
    scaledSize: new google.maps.Size(36, 36),
    anchor: new google.maps.Point(18, 18),
  };

  VEHICLE_BASES.forEach((vb) => {
    const el = document.createElement("div");
    el.className = "vehicle-card";
    el.id = `veh-${vb.id}`;
    el.innerHTML = `
      <div><strong>${vb.name}</strong></div>
      <div class="small">${vb.pos.lat.toFixed(4)}, ${vb.pos.lng.toFixed(
      4
    )}</div>
    `;
    el.addEventListener("click", () => focusVehicle(vb.id));
    list.appendChild(el);

    const marker = new google.maps.Marker({
      position: vb.pos,
      map,
      title: vb.name,
      icon: vehicleIcon,
    });

    vehicles.push({
      id: vb.id,
      name: vb.name,
      pos: vb.pos,
      marker,
      routePolyline: null,
    });
  });
}

// -------------------------
// Seleção de incidente
// -------------------------
function selectIncident(id) {
  selectedIncident = incidents.find((inc) => inc.id === id);
  if (!selectedIncident) return;

  // Atualiza visual dos cards
  incidents.forEach((inc) => {
    inc.selected = inc.id === id;
    const div = document.getElementById(`inc-${inc.id}`);
    if (div) {
      div.classList.toggle("selected", inc.selected);
    }
  });

  // Centraliza mapa no incidente selecionado
  map.panTo(selectedIncident.pos);
  map.setZoom(15);
}

// -------------------------
// Focar viatura (caso clique)
// -------------------------
function focusVehicle(id) {
  const v = vehicles.find((veh) => veh.id === id);
  if (!v) return;
  map.panTo(v.pos);
  map.setZoom(15);
}

// -------------------------
// Controles (Despachar / Resetar)
// -------------------------
function setupControls() {
  const dispatchBtn = document.getElementById("dispatchBtn");
  const resetBtn = document.getElementById("resetBtn");

  dispatchBtn.addEventListener("click", dispatchVehicles);
  resetBtn.addEventListener("click", resetRoutes);
}

function dispatchVehicles() {
  if (!selectedIncident) {
    alert("Selecione um incidente na lista antes de despachar.");
    return;
  }

  const select = document.getElementById("selectCount");
  const count = parseInt(select.value, 10) || 1;

  // Limpa rotas anteriores
  resetRoutes(false);

  // Pega as N primeiras viaturas
  const toDispatch = vehicles.slice(0, count);

  toDispatch.forEach((veh) => {
    const request = {
      origin: veh.pos,
      destination: selectedIncident.pos,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        const path = result.routes[0].overview_path;

        const polyline = new google.maps.Polyline({
          path,
          map,
          strokeColor: "#4c8dff",
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });

        veh.routePolyline = polyline;
      } else {
        console.error("Erro ao calcular rota:", status);
      }
    });
  });
}

function resetRoutes(showAlert = true) {
  vehicles.forEach((veh) => {
    if (veh.routePolyline) {
      veh.routePolyline.setMap(null);
      veh.routePolyline = null;
    }
  });
  if (showAlert) {
    // opcional: feedback visual simples
    console.log("Rotas resetadas.");
  }
}

// Torna initMap visível para o callback do Google Maps
window.initMap = initMap;
