function initRouteMap() {
  const routesData = {
    linha410: {
      label: "Linha 410",
      description: "Terminal Verde Vida → Parque Atlântico",
      path: [
        [-23.5615, -46.6559],
        [-23.5601, -46.6502],
        [-23.558, -46.6438],
        [-23.5532, -46.6365],
        [-23.5489, -46.6291]
      ],
      stops: [
        {
          name: "Terminal Verde Vida",
          description: "Integração com metrô Linha Verde e bicicletário seguro.",
          coords: [-23.5615, -46.6559]
        },
        {
          name: "Jardim Primavera",
          description: "Corredor exclusivo com embarque preferencial.",
          coords: [-23.5589, -46.6457]
        },
        {
          name: "Hub Intermodal Central",
          description: "Conexão com VLT e linhas intermunicipais.",
          coords: [-23.5556, -46.6399]
        },
        {
          name: "Parque Atlântico",
          description: "Ponto final próximo ao centro cultural e área verde.",
          coords: [-23.5489, -46.6291]
        }
      ]
    },
    linha128: {
      label: "Linha 128",
      description: "Jardim Horizonte → Centro Integrado",
      path: [
        [-23.5838, -46.6662],
        [-23.5795, -46.6578],
        [-23.5732, -46.6505],
        [-23.5663, -46.6419]
      ],
      stops: [
        {
          name: "Jardim Horizonte",
          description: "Terminal com wi-fi gratuito e painéis de LED.",
          coords: [-23.5838, -46.6662]
        },
        {
          name: "Avenida Solar",
          description: "Parada com integração a ciclovia estrutural.",
          coords: [-23.5795, -46.6578]
        },
        {
          name: "Estação Linha Azul",
          description: "Integração direta com metrô e trem metropolitano.",
          coords: [-23.5732, -46.6505]
        },
        {
          name: "Centro Integrado",
          description: "Terminal empresarial com plataformas cobertas.",
          coords: [-23.5663, -46.6419]
        }
      ]
    },
    linha520: {
      label: "Linha 520",
      description: "Campus Norte → Bairro Solar",
      path: [
        [-23.5462, -46.697],
        [-23.5411, -46.688],
        [-23.538, -46.676],
        [-23.533, -46.667]
      ],
      stops: [
        {
          name: "Campus Norte",
          description: "Ponto inicial com integração às linhas universitárias circulares.",
          coords: [-23.5462, -46.697]
        },
        {
          name: "Laboratórios Integrados",
          description: "Atende polos de pesquisa e incubadoras tecnológicas.",
          coords: [-23.5411, -46.688]
        },
        {
          name: "Terminal Azul",
          description: "Conexão com linhas alimentadoras de bairros adjacentes.",
          coords: [-23.538, -46.676]
        },
        {
          name: "Bairro Solar",
          description: "Ponto final em área residencial com comércio local.",
          coords: [-23.533, -46.667]
        }
      ]
    }
  };

  const map = L.map("routeMap", {
    scrollWheelZoom: false,
    minZoom: 11
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  let routePolyline = null;
  let stopMarkers = [];
  const infoElement = document.getElementById("routeMapInfo");
  const infoBaseMessage = infoElement ? infoElement.textContent : "";

  function clearCurrentRoute() {
    if (routePolyline) {
      map.removeLayer(routePolyline);
      routePolyline = null;
    }
    stopMarkers.forEach(marker => map.removeLayer(marker));
    stopMarkers = [];
  }

  function loadRoute(routeId) {
    const route = routesData[routeId];
    if (!route) {
      return;
    }

    clearCurrentRoute();

    routePolyline = L.polyline(route.path, {
      color: "#2f9c5c",
      weight: 5,
      opacity: 0.9,
      lineJoin: "round"
    }).addTo(map);

    stopMarkers = route.stops.map(stop => {
      return L.circleMarker(stop.coords, {
        radius: 6,
        fillColor: "#155f9c",
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      })
        .addTo(map)
        .bindPopup(`<strong>${stop.name}</strong><br>${stop.description}`);
    });

    const bounds = routePolyline.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24] });
    } else {
      map.setView(route.path[0], 13);
    }

    if (infoElement) {
      infoElement.textContent = `${infoBaseMessage} Rota ativa: ${route.label} — ${route.description}. ${route.stops.length} paradas georreferenciadas.`;
    }
  }

  const activeButton = document.querySelector("#lineTabs .nav-link.active[data-route]");
  const initialRouteId = activeButton ? activeButton.dataset.route : "linha410";
  loadRoute(initialRouteId);

  document.querySelectorAll("#lineTabs .nav-link[data-route]").forEach(button => {
    button.addEventListener("shown.bs.tab", event => {
      const { route } = event.target.dataset;
      loadRoute(route);
    });
  });
}

document.addEventListener("DOMContentLoaded", initRouteMap);