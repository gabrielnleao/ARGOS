// -------------------------
// Dados de incidentes
// -------------------------
const INCIDENTS_DATA = [
  {
    id: 1,
    title: "Batida de Carro em Avenida",
    type: "Ocorrência de gravidade média",
    pos: { lat: -8.0505, lng: -34.8925 },
    icon: "inc_acidente.png",          // ícone do incidente
    cameraUrl: "batida.png"            // IMAGEM da câmera para esse incidente
  },
  {
    id: 2,
    title: "Assalto em andamento",
    type: "Ocorrência de gravidade alta",
    pos: { lat: -8.045, lng: -34.885 },
    icon: "inc_assalto.png",
    cameraUrl: "assalto.png"           // coloque a imagem correspondente
  },
  {
    id: 3,
    title: "Incêndio em área comercial",
    type: "Ocorrência de gravidade alta com chances de ser proposital",
    pos: { lat: -8.06, lng: -34.89 },
    icon: "inc_incendio.png",
    cameraUrl: "incendio.png"
  },
  {
    id: 4,
    title: "Resgate de civil em situação de risco",
    type: "Ocorrência de alta gravidade e risco policial",
    pos: { lat: -8.0435, lng: -34.878 },
    icon: "inc_resgate.png",
    cameraUrl: "resgate.png"
  },
  {
    id: 5,
    title: "Grande engarrafamento em via principal",
    type: "Ocorrência de gravidade baixa",
    pos: { lat: -8.055, lng: -34.9 },
    icon: "inc_congestionamento.png",
    cameraUrl: "congestionamento.png"
  }
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

// Modal refs
const incidentModalEl = document.getElementById("incidentModal");
const incidentModalCloseBtn = document.getElementById("incidentModalClose");
const modalIncidentTitleEl = document.getElementById("modalIncidentTitle");
const modalIncidentTypeEl = document.getElementById("modalIncidentType");
const modalIncidentLocationEl = document.getElementById(
  "modalIncidentLocation"
);
const modalVehiclesListEl = document.getElementById("modalVehiclesList");
const modalCameraImageEl = document.getElementById("modalCameraImage");
const modalVehicleCountEl = document.getElementById("modalVehicleCount");
const modalDispatchBtnEl = document.getElementById("modalDispatchBtn");

// Lista das viaturas mais próximas do incidente atual (mostradas no popup)
let modalNearestVehicles = [];

// -------------------------
// Helpers
// -------------------------
function formatDistance(meters) {
  if (!meters && meters !== 0) return "";
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

// Retorna as N viaturas mais próximas de uma posição
function getNearestVehicles(pos, count = 3) {
  const incidentLatLng = new google.maps.LatLng(pos.lat, pos.lng);

  const withDistance = vehicles.map((v) => {
    const vehLatLng = new google.maps.LatLng(v.pos.lat, v.pos.lng);
    const dist = google.maps.geometry.spherical.computeDistanceBetween(
      vehLatLng,
      incidentLatLng
    );
    return { ...v, distance: dist };
  });

  withDistance.sort((a, b) => a.distance - b.distance);
  return withDistance.slice(0, count);
}

// Limpa rota e animação de uma viatura específica
function clearVehicleRoute(vehicle) {
  if (vehicle.routePolyline) {
    vehicle.routePolyline.setMap(null);
    vehicle.routePolyline = null;
  }
  if (vehicle.routeAnimation) {
    clearInterval(vehicle.routeAnimation);
    vehicle.routeAnimation = null;
  }
}

// -------------------------
// Inicialização do mapa
// -------------------------
function initMap() {
  const center = { lat: -8.05, lng: -34.89 };

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
  setupModalEvents();
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

    marker.addListener("click", () => selectIncident(it.id));

    incidents.push({
      id: it.id,
      title: it.title,
      type: it.type,
      pos: it.pos,
      marker,
      cameraUrl: it.cameraUrl,
      selected: false,
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
      routeAnimation: null,
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

  // Abre popup com câmera + informações
  openIncidentModal(selectedIncident);
}

// -------------------------
// Focar viatura (se usar clique na lista algum dia)
// -------------------------
function focusVehicle(id) {
  const v = vehicles.find((veh) => veh.id === id);
  if (!v) return;
  map.panTo(v.pos);
  map.setZoom(15);
}

// -------------------------
// Despacho de viatura (função base)
// -------------------------
function dispatchVehicleToIncident(vehicle, incident) {
  if (!vehicle || !incident) return;

  // Limpa rota/animação anterior da viatura
  clearVehicleRoute(vehicle);

  const request = {
    origin: vehicle.pos,
    destination: incident.pos,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      const path = result.routes[0].overview_path;

      // Desenha a rota
      const polyline = new google.maps.Polyline({
        path,
        map,
        strokeColor: "#4c8dff",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });

      vehicle.routePolyline = polyline;

      // Anima a viatura ao longo do path
      let step = 0;
      const totalSteps = path.length;

      vehicle.routeAnimation = setInterval(() => {
        if (step >= totalSteps) {
          clearInterval(vehicle.routeAnimation);
          vehicle.routeAnimation = null;
          return;
        }

        const point = path[step];
        vehicle.marker.setPosition(point);
        vehicle.pos = { lat: point.lat(), lng: point.lng() };

        step++;
      }, 80); // velocidade da animação (ms por ponto)
    } else {
      console.error("Erro ao calcular rota:", status);
    }
  });
}

// Despachar múltiplas viaturas (N escolhidas no popup)
function dispatchSelectedCountForCurrentIncident() {
  if (!selectedIncident || modalNearestVehicles.length === 0) return;

  const count = parseInt(modalVehicleCountEl.value, 10) || 1;
  const toDispatch = modalNearestVehicles.slice(0, count);

  toDispatch.forEach((vehWrapper) => {
    const vehicle = vehicles.find((v) => v.id === vehWrapper.id);
    if (vehicle) {
      dispatchVehicleToIncident(vehicle, selectedIncident);
    }
  });

  // fecha o popup depois de despachar
  closeIncidentModal();
}

// -------------------------
// Modal do incidente
// -------------------------
function setupModalEvents() {
  if (incidentModalCloseBtn) {
    incidentModalCloseBtn.addEventListener("click", () =>
      closeIncidentModal()
    );
  }

  if (incidentModalEl) {
    // Fechar ao clicar fora do card
    incidentModalEl.addEventListener("click", (e) => {
      if (e.target === incidentModalEl) {
        closeIncidentModal();
      }
    });
  }

  if (modalDispatchBtnEl) {
    modalDispatchBtnEl.addEventListener("click", () =>
      dispatchSelectedCountForCurrentIncident()
    );
  }
}

function openIncidentModal(incident) {
  if (!incidentModalEl) return;

  if (modalIncidentTitleEl) {
    modalIncidentTitleEl.textContent = incident.title;
  }

  if (modalIncidentTypeEl) {
    modalIncidentTypeEl.textContent = incident.type
      ? `Tipo: ${incident.type}`
      : "";
  }

  if (modalIncidentLocationEl) {
    modalIncidentLocationEl.textContent = `Localização aproximada: ${incident.pos.lat.toFixed(
      4
    )}, ${incident.pos.lng.toFixed(4)}`;
  }

  // Imagem da câmera
  if (modalCameraImageEl) {
    modalCameraImageEl.src = incident.cameraUrl || "placeholder_camera.png";
    modalCameraImageEl.alt = incident.title || "Imagem da câmera";
  }

  // 3 viaturas mais próximas (lista + select de quantidade)
  modalNearestVehicles = getNearestVehicles(incident.pos, 3);

  if (modalVehiclesListEl) {
    modalVehiclesListEl.innerHTML = "";
    modalNearestVehicles.forEach((v) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${v.name}</strong><span>${formatDistance(
        v.distance
      )} até o incidente</span>`;
      modalVehiclesListEl.appendChild(li);
    });
  }

  if (modalVehicleCountEl) {
    modalVehicleCountEl.innerHTML = "";
    const max = modalNearestVehicles.length || 1;
    for (let i = 1; i <= max; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      modalVehicleCountEl.appendChild(opt);
    }
  }

  incidentModalEl.classList.add("open");
}

function closeIncidentModal() {
  if (!incidentModalEl) return;
  incidentModalEl.classList.remove("open");
}

// -------------------------
// Expor initMap para o Google Maps
// -------------------------
window.initMap = initMap;
