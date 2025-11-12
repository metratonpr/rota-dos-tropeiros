from django.shortcuts import render
from .models import Rota
import random

# Create your views here.
def index(request):
    '''
    Que a rota/view principal do meu projeto    '''    
    #Buscar rotas
    rotas = Rota.objects.filter(ativo=True).prefetch_related('horarios_parada__parada')
    
    #proximas_partidas
    proximas_partidas = get_proximas_partidas(rotas)   
        
    context = {
        'rotas': rotas,
        'proximas_partidas': proximas_partidas
    
    }    

    return render(request, 'rotas/index.html', context)

def get_proximas_partidas(rotas, limit = 3):
    """
    Retorna as proximas partidas.
    """
    
    partidas = []
    
    badge_colors = ['success', 'primary', 'info']
    
    for idx, rota in enumerate(rotas[:limit]):
        
        primeiro_horario = rota.horarios_parada.filter(ativo=True).first()
        
        if primeiro_horario:
            horarios_ordenados = list(rota.horarios_parada.filter(ativo=True).order_by('horario'))
            
            origem = horarios_ordenados[0].parada.endereco if horarios_ordenados else 'Terminal'
            destino = horarios_ordenados[-1].parada.endereco if len(horarios_ordenados) > 1 else 'Garagem'
            
            partidas.append({
                'rota': rota,
                'origem': origem[:30] + '...' if len(origem) > 30 else origem,
                'destino': destino[:30] + '...' if len(destino) > 30 else destino,
                'horario': primeiro_horario.horario.strftime('%H:%M'),
                'badge_color': random.choice(badge_colors)
            })       

    
    #Retorna partidas preenchidas
    return partidas