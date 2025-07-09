async function fetchLeaderboardData() {
  try {
    const response = await fetch('/api/scrape-leaderboard');
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Error en los datos');

    // Actualizar Race Mode
    const raceMode = document.getElementById('race-mode');
    raceMode.querySelector('.escenario').textContent = data.raceMode.metadata.escenario;
    raceMode.querySelector('.track-name').textContent = data.raceMode.metadata.track;
    updateTable('race-mode-data', data.raceMode.resultados);

    // Actualizar 3 Lap
    const threeLap = document.getElementById('three-lap');
    threeLap.querySelector('.escenario').textContent = data.threeLap.metadata.escenario;
    threeLap.querySelector('.track-name').textContent = data.threeLap.metadata.track;
    updateTable('three-lap-data', data.threeLap.resultados);

  } catch (error) {
    console.error('Error:', error);
    document.getElementById('error-message').textContent = `Error: ${error.message}`;
    setTimeout(() => {
      document.getElementById('error-message').textContent = '';
    }, 5000);
  }
}

function updateTable(tableId, data) {
  const tableBody = document.getElementById(tableId);
  if (!tableBody || !Array.isArray(data)) return;
  
  tableBody.innerHTML = data.map((row, index) => `
    <tr>
      <td>${row.position || index + 1}</td>
      <td>${row.pilot || 'N/A'}</td>
      <td>${row.time || 'N/A'}</td>
    </tr>
  `).join('');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  fetchLeaderboardData();
  document.getElementById('refresh-btn').addEventListener('click', fetchLeaderboardData);
  setInterval(fetchLeaderboardData, 60000); // Actualizar cada minuto
});