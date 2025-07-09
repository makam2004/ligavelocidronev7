async function fetchLeaderboardData() {
  try {
    const response = await fetch('/api/scrape-leaderboard');
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    const data = await response.json();
    
    if (data.success) {
      // Actualizar la información del track y escenario
      document.getElementById('escenario').textContent = data.metadata.escenario;
      document.getElementById('track-name').textContent = data.metadata.track;
      
      // Actualizar las tablas
      updateTable('race-mode-data', data.raceMode);
      updateTable('three-lap-data', data.threeLap);
    } else {
      throw new Error(data.error || 'Error desconocido');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    document.getElementById('error-message').textContent = `Error: ${error.message}`;
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

// Cargar datos al iniciar y cada 60 segundos
document.addEventListener('DOMContentLoaded', () => {
  fetchLeaderboardData();
  document.getElementById('refresh-btn').addEventListener('click', fetchLeaderboardData);
  
  setInterval(fetchLeaderboardData, 60000);
});