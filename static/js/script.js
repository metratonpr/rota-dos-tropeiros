/**
 * Viação Rota dos Tropeiros - Route Map Module
 * Gerencia o mapa interativo de rotas usando Leaflet
 */

(function() {
  'use strict';

  // Coordenadas de Castro-PR (centro da cidade)
  const CASTRO_CENTER = [-24.7911, -50.0119];

  /**
   * Inicializa o mapa de rotas
   */
  function initRouteMap() {
    const mapElement = document.getElementById('routeMap');
    if (!mapElement) {
      console.error('Elemento #routeMap não encontrado!');
      return;
    }

    console.log('Elemento #routeMap encontrado, iniciando mapa...');
    console.log('Dimensões do elemento:', mapElement.offsetWidth, 'x', mapElement.offsetHeight);

    // Dados das rotas - em produção, buscar do backend via API
    const routesData = window.ROUTES_DATA || getDefaultRoutesData();
    const allStops = window.ALL_STOPS || [];
    console.log('Dados das rotas carregados:', Object.keys(routesData));
    console.log('Total de paradas na cidade:', allStops.length);

    // Inicializa o mapa centralizado em Castro-PR
    const map = L.map('routeMap', {
      center: CASTRO_CENTER,
      zoom: 13,
      scrollWheelZoom: false,
      minZoom: 11,
      maxZoom: 18
    });

    console.log('Mapa Leaflet criado com sucesso');

    // Adiciona camada de tiles do OpenStreetMap (gratuito)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    console.log('Tiles do OpenStreetMap adicionados');

    // Force o mapa a recalcular seu tamanho após renderização
    setTimeout(() => {
      map.invalidateSize();
      console.log('Tamanho do mapa invalidado/recalculado');
    }, 100);

    // LayerGroup para gerenciar TODAS as camadas da rota ativa
    let currentRouteLayerGroup = L.layerGroup().addTo(map);
    let allStopMarkers = []; // Marcadores de TODAS as paradas da cidade (fixas)
    const infoElement = document.getElementById('routeMapInfo');
    const infoBaseMessage = infoElement ? infoElement.textContent : '';

    /**
     * Adiciona TODAS as paradas da cidade no mapa (pinos cinzas)
     */
    function addAllStopsToMap() {
      allStops.forEach(stop => {
        const marker = L.marker(stop.coords, {
          icon: L.divIcon({
            className: 'custom-stop-marker',
            html: '<div style="background-color: #6c757d; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        })
          .addTo(map)
          .bindPopup(`<strong>📍 ${stop.name}</strong><br><small>Parada de ônibus</small>`);
        
        allStopMarkers.push(marker);
      });
      console.log(`${allStopMarkers.length} paradas da cidade adicionadas ao mapa`);
    }

    /**
     * Remove TODAS as camadas da rota atual (linha + marcadores)
     * MANTÉM as paradas fixas (pinos cinzas)
     */
    function clearCurrentRoute() {
      console.log('🧹 Limpando TODAS as camadas da rota anterior...');
      
      // Remove TODAS as camadas do grupo (linhas + marcadores azuis)
      currentRouteLayerGroup.clearLayers();
      
      console.log('✓ Rota anterior completamente limpa');
    }

    /**
     * Carrega uma rota no mapa
     * @param {string} routeId - ID da rota
     */
    async function loadRoute(routeId) {
      console.log(`\n🔄 Carregando rota: ${routeId}`);
      
      const route = routesData[routeId];
      if (!route) {
        console.warn(`❌ Rota ${routeId} não encontrada.`);
        return;
      }

      // IMPORTANTE: Limpa a rota anterior ANTES de carregar a nova
      clearCurrentRoute();

      // Remove duplicatas das paradas (mesma coordenada)
      const uniqueStops = [];
      const seenCoords = new Set();
      
      route.stops.forEach(stop => {
        const coordKey = `${stop.coords[0].toFixed(6)},${stop.coords[1].toFixed(6)}`;
        if (!seenCoords.has(coordKey)) {
          seenCoords.add(coordKey);
          uniqueStops.push(stop);
        }
      });

      console.log(`Rota tem ${route.stops.length} paradas, ${uniqueStops.length} únicas`);

      // Adiciona marcadores DESTACADOS das paradas da rota (azuis maiores)
      // IMPORTANTE: Adiciona ao LayerGroup, não direto no mapa
      uniqueStops.forEach(stop => {
        const marker = L.circleMarker(stop.coords, {
          radius: 8,
          fillColor: '#155f9c',
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 1,
          zIndexOffset: 1000 // Fica por cima das paradas cinzas
        })
          .bindPopup(`<strong>🚏 ${stop.name}</strong><br>${stop.description}`);
        
        currentRouteLayerGroup.addLayer(marker);
      });
      
      console.log(`✓ ${uniqueStops.length} marcadores destacados adicionados ao grupo`);

      // Busca rota real pelas ruas usando OSRM
      try {
        console.log(`Buscando rota pelas ruas para ${routeId}...`);
        
        // Monta coordenadas no formato: lng,lat;lng,lat;...
        const coordinates = route.path.map(coord => `${coord[1]},${coord[0]}`).join(';');
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          // Desenha a linha da rota seguindo as ruas
          const geometry = data.routes[0].geometry;
          const routeCoords = geometry.coordinates.map(coord => [coord[1], coord[0]]); // Inverte para [lat, lng]
          
          const routeLine = L.polyline(routeCoords, {
            color: '#2f9c5c',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round'
          });
          
          // Adiciona ao LayerGroup ao invés de direto no mapa
          currentRouteLayerGroup.addLayer(routeLine);
          
          console.log(`✅ Rota pelas ruas carregada: ${(data.routes[0].distance / 1000).toFixed(2)} km`);
          console.log(`✓ Linha verde adicionada ao grupo (${routeCoords.length} pontos)`);
          
          // Ajusta zoom para a nova rota
          map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
        } else {
          // Fallback: linha reta se OSRM falhar
          console.warn('OSRM falhou, usando linha reta');
          const routeLine = L.polyline(route.path, {
            color: '#2f9c5c',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round',
            dashArray: '10, 10' // Linha tracejada para indicar que é aproximado
          });
          
          currentRouteLayerGroup.addLayer(routeLine);
          map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
        }
      } catch (error) {
        console.error('Erro ao buscar rota:', error);
        // Fallback: linha reta
        const routeLine = L.polyline(route.path, {
          color: '#2f9c5c',
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
          dashArray: '10, 10'
        });
        
        currentRouteLayerGroup.addLayer(routeLine);
        map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
      }

      // Atualiza informações
      if (infoElement) {
        const baseMsg = 'Mapa das rotas em Castro-PR.';
        infoElement.textContent = `${baseMsg} Rota ativa: ${route.label} — ${route.description}. ${route.stops.length} paradas.`;
      }
    }

    // Adiciona TODAS as paradas da cidade no mapa (pinos cinzas)
    addAllStopsToMap();

    // Carrega rota inicial ou mostra mapa de Castro
    const activeButton = document.querySelector('#lineTabs .nav-link.active[data-route]');
    if (activeButton && Object.keys(routesData).length > 0) {
      const initialRouteId = activeButton.dataset.route || Object.keys(routesData)[0];
      loadRoute(initialRouteId);
    } else {
      // Se não há rotas, apenas mostra o mapa de Castro
      map.setView(CASTRO_CENTER, 13);
      if (infoElement) {
        infoElement.textContent = 'Mapa de Castro-PR. Selecione uma linha para ver o trajeto.';
      }
    }    // Event listener para mudança de abas (evento do Bootstrap)
    // Primeiro tenta o seletor específico, depois fallbacks
    let tabButtons = document.querySelectorAll('#lineTabs .nav-link[data-route]');
    
    if (tabButtons.length === 0) {
      // Fallback 1: qualquer .nav-link com data-route
      tabButtons = document.querySelectorAll('.nav-link[data-route]');
    }
    
    if (tabButtons.length === 0) {
      // Fallback 2: qualquer elemento com data-route
      tabButtons = document.querySelectorAll('[data-route]');
    }
    
    console.log('🔍 Botões com data-route encontrados:', tabButtons.length);
    
    if (tabButtons.length === 0) {
      console.warn('❌ Nenhum botão com data-route encontrado!');
      console.log('DOM completo:', document.body.innerHTML.length > 0 ? 'Carregado' : 'Vazio');
      console.log('Elemento #lineTabs existe?', !!document.getElementById('lineTabs'));
      console.log('Todos elementos .nav-link:', document.querySelectorAll('.nav-link').length);
      console.log('Todos elementos [data-route]:', document.querySelectorAll('[data-route]').length);
      
      // Lista todos os elementos que poderiam ser botões de rota
      document.querySelectorAll('.nav-link, [role="tab"], .tab-button, [data-bs-toggle="tab"]').forEach((el, i) => {
        console.log(`Elemento ${i}:`, {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          textContent: el.textContent?.trim(),
          dataset: el.dataset
        });
      });
    }

    tabButtons.forEach((button, index) => {
      const routeId = button.dataset.route;
      console.log(`Configurando botão ${index}:`, {
        route: routeId,
        text: button.textContent.trim(),
        id: button.id,
        tagName: button.tagName
      });
      
      // Marca como processado para evitar duplicação
      if (button.hasAttribute('data-map-listener')) {
        return;
      }
      button.setAttribute('data-map-listener', 'true');
      
      // Evento do Bootstrap quando a tab é exibida
      button.addEventListener('shown.bs.tab', event => {
        const targetRouteId = event.target.dataset.route;
        console.log('📋 Tab shown (Bootstrap):', targetRouteId);
        loadRoute(targetRouteId);
      });
      
      // Fallback: escuta cliques diretos
      button.addEventListener('click', event => {
        const targetRouteId = event.currentTarget.dataset.route;
        console.log('👆 Tab clicked:', targetRouteId);
        
        // Delay para aguardar o Bootstrap processar
        setTimeout(() => {
          console.log('⏰ Carregando rota após click:', targetRouteId);
          loadRoute(targetRouteId);
        }, 100);
      });
    });

    console.log('Mapa inicializado. Rotas disponíveis:', Object.keys(routesData));
    console.log('Event listeners adicionados a', tabButtons.length, 'botões específicos');
  }
  /**
   * Retorna dados padrão das rotas para Castro-PR (fallback)
   */
  function getDefaultRoutesData() {
    return {
      linha1: {
        label: 'Linha 410',
        description: 'Terminal Verde Vida → Parque Atlântico',
        path: [
          [-24.7911, -50.0119], // Terminal Verde Vida
          [-24.7850, -50.0100], // Praça da Bandeira  
          [-24.7800, -50.0080], // Shopping Castro
          [-24.7750, -50.0060]  // Parque Atlântico
        ],
        stops: [
          {
            name: 'Terminal Verde Vida',
            description: 'Ponto de partida - Terminal principal',
            coords: [-24.7911, -50.0119]
          },
          {
            name: 'Praça da Bandeira',
            description: 'Centro da cidade',
            coords: [-24.7850, -50.0100]
          },
          {
            name: 'Shopping Castro',
            description: 'Centro comercial',
            coords: [-24.7800, -50.0080]
          },
          {
            name: 'Parque Atlântico',
            description: 'Destino final',
            coords: [-24.7750, -50.0060]
          }
        ]
      },
      linha2: {
        label: 'Linha 128',
        description: 'Jardim Horizonte → Centro Integrado',
        path: [
          [-24.7950, -50.0150], // Jardim Horizonte
          [-24.7900, -50.0125], // Vila Nova
          [-24.7850, -50.0100], // Centro
          [-24.7800, -50.0075]  // Centro Integrado
        ],
        stops: [
          {
            name: 'Jardim Horizonte',
            description: 'Ponto de partida',
            coords: [-24.7950, -50.0150]
          },
          {
            name: 'Vila Nova',
            description: 'Bairro residencial',
            coords: [-24.7900, -50.0125]
          },
          {
            name: 'Centro',
            description: 'Centro da cidade',
            coords: [-24.7850, -50.0100]
          },
          {
            name: 'Centro Integrado',
            description: 'Destino final',
            coords: [-24.7800, -50.0075]
          }
        ]
      },
      linha3: {
        label: 'Linha 520',
        description: 'Campus Norte → Bairro Solar',
        path: [
          [-24.7880, -50.0200], // Campus Norte
          [-24.7860, -50.0175], // Distrito Industrial
          [-24.7840, -50.0150], // Centro
          [-24.7820, -50.0125]  // Bairro Solar
        ],
        stops: [
          {
            name: 'Campus Norte',
            description: 'Universidade - Ponto de partida',
            coords: [-24.7880, -50.0200]
          },
          {
            name: 'Distrito Industrial',
            description: 'Zona industrial',
            coords: [-24.7860, -50.0175]
          },
          {
            name: 'Centro',
            description: 'Centro da cidade',
            coords: [-24.7840, -50.0150]
          },
          {
            name: 'Bairro Solar',
            description: 'Destino final',
            coords: [-24.7820, -50.0125]
          }
        ]
      }
    };
  }
  // Inicializa quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🚀 DOM carregado, inicializando mapa...');
      setTimeout(initRouteMap, 100); // Pequeno delay para garantir que tudo carregou
    });
  } else {
    console.log('🚀 DOM já carregado, inicializando mapa...');
    setTimeout(initRouteMap, 100);
  }

})();